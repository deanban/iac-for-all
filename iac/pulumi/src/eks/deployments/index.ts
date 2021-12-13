import * as pulumi from '@pulumi/pulumi';
import * as k8s from '@pulumi/kubernetes';
import * as nginx from '@pulumi/kubernetes-ingress-nginx';
import { nsDevName, cluster } from '../cluster';

const config = new pulumi.Config('aws');

const apps = [];
const appBase = 'app';
const appNames = [`${appBase}-coffee`, `${appBase}-eggs`];

// Create a deployment and a service for each app.
for (const appName of appNames) {
  const appSvc = new k8s.core.v1.Service(
    `${appName}-svc`,
    {
      metadata: { name: appName, namespace: nsDevName },
      spec: {
        type: 'ClusterIP',
        ports: [{ port: 80, targetPort: 8080 }],
        selector: { app: appName },
      },
    },
    { provider: cluster.provider }
  );

  const appDep = new k8s.apps.v1.Deployment(
    `${appName}-dep`,
    {
      metadata: { name: appName, namespace: nsDevName },
      spec: {
        replicas: 1,
        selector: {
          matchLabels: { app: appName },
        },
        template: {
          metadata: {
            labels: { app: appName },
          },
          spec: {
            containers: [
              {
                name: appName,
                image: 'nginx',
                ports: [{ containerPort: 8080 }],
                env: [
                  { name: 'MESSAGE', value: 'Enjoy your eggs with coffee' },
                ],
              },
            ],
          },
        },
      },
    },
    { provider: cluster.provider }
  );

  apps.push(appSvc.status);
}

/**Deploy the NGINX ingress controller using 2 methods.
 * 1. the easier way: using the @pulumi/kubernetes-ingress-nginx package.
 * 2. the easy way: using the nginx helm chart.
 * */

/**
 * 1. Using the @pulumi/kubernetes-ingress-nginx package.
 * */

const nginxController = new nginx.IngressController(
  'nginx-controller',
  {
    controller: {
      publishService: {
        enabled: true,
      },
    },
  },
  { provider: cluster.provider }
);

/**
 * 2. Using the nginx helm chart.
 * code example below-
 * */

// const nginx = new k8s.helm.v2.Chart(
//   "nginx",
//   {
//     chart: "nginx-ingress",
//     version: "1.24.4",
//     namespace: nsDevName,
//     fetchOpts: { repo: "https://kubernetes-charts.storage.googleapis.com/" },
//     values: { controller: { publishService: { enabled: true } } },
//     transformations: [
//       (obj: any) => {
//         // Do transformations on the YAML to set the namespace
//         if (obj.metadata) {
//           obj.metadata.namespace = nsDevName;
//         }
//       }
//     ]
//   },
//   { providers: { kubernetes: cluster.provider } }
// );

// Create nginx ingress
const appIngress = new k8s.networking.v1.Ingress(
  `${appBase}-ingress`,
  {
    metadata: {
      name: 'coffee-and-eggs-ingress',
      annotations: {
        'kubernetes.io/ingress.class': 'nginx',
      },
    },
    spec: {
      rules: [
        {
          host: config.getSecret('host1'),
          http: {
            paths: [
              {
                pathType: 'Prefix',
                backend: {
                  service: {
                    name: appNames[0],
                    port: {
                      number: 80,
                    },
                  },
                },
              },
            ],
          },
        },
        {
          host: config.getSecret('host2'),
          http: {
            paths: [
              {
                pathType: 'Prefix',
                backend: {
                  service: {
                    name: appNames[0],
                    port: {
                      number: 80,
                    },
                  },
                },
              },
            ],
          },
        },
      ],
    },
  },
  { provider: cluster.provider }
);

// exprt the deployment and ingress
export const appStatuses = apps;
export const controllerStatus = nginxController.status;
export const ingressHostname =
  appIngress.status.loadBalancer.ingress[0].hostname;
export const ingressAddress = appIngress.status.loadBalancer.ingress[0].ip;
