import * as k8s from '@pulumi/kubernetes';

import {nsDevName, nsProdName, cluster} from '../cluster';

const appLabels = { app: 'nginx' };

const service = new k8s.core.v1.Service(
  `${appLabels.app}-service`,
  {
    metadata: {
      name: `${appLabels.app}-service`,
      labels: appLabels,
      namespace: nsDevName,
    },
    spec: {
      type: 'LoadBalancer',
      ports: [
        {
          port: 80,
          targetPort: 8080,
          name: 'http',
        },
      ],
      selector: appLabels
    },
  },
  { provider: cluster.provider }
);

const deployment = new k8s.apps.v1.Deployment('nginx', {
  spec: {
    selector: { matchLabels: appLabels },
    replicas: 1,
    template: {
      metadata: { labels: appLabels, namespace: 'dev' },
      spec: { containers: [{ name: 'nginx', image: 'nginx' }] },
    },
  },
});

// Deploy the NGINX ingress controller using the Helm chart.
const nginx = new k8s.helm.v2.Chart(
  "nginx",
  {
    chart: "nginx-ingress",
    version: "1.24.4",
    namespace: nsDevName,
    fetchOpts: { repo: "https://kubernetes-charts.storage.googleapis.com/" },
    values: { controller: { publishService: { enabled: true } } },
    transformations: [
      (obj: any) => {
        // Do transformations on the YAML to set the namespace
        if (obj.metadata) {
          obj.metadata.namespace = nsDevName;
        }
      }
    ]
  },
  { providers: { kubernetes: cluster.provider } }
);

const ingress = new k8s.networking.v1beta1.Ingress(
  `nginx-ingress`,
  {
    metadata: {
      labels: appLabels,
      namespace: nsDevName,
      annotations: { "kubernetes.io/ingress.class": "nginx" }
    },
    spec: {
      rules: [
        {
          host: "search.altana.ai",
          http: {
            paths: [
              {
                path: "/",
                backend: {
                  serviceName: "search",
                  servicePort: 80
                }
              }
            ]
          }
        },
        {
          host: "graph.altana.ai",
          http: {
            paths: [
              {
                path: "/",
                backend: {
                  serviceName: "graph",
                  servicePort: 80
                }
              }
            ]
          }
        }
      ],
    }
  },
  { provider: cluster.provider }
);

export const ingressService = service.status
export const ingressHostname = ingress.status.loadBalancer.ingress[0].hostname;
export const ingressAddress = ingress.status.loadBalancer.ingress[0].ip;
export const deploymentName = deployment.metadata.name;
