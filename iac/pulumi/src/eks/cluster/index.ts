/**
 * TASK:
 * A single EKS cluster in all subnets, with public endpoint access enabled
 */

import * as aws from '@pulumi/aws';
import * as eks from '@pulumi/eks';
import * as k8s from '@pulumi/kubernetes';
import * as pulumi from '@pulumi/pulumi';

import { vpcId, subnetIds, sg, providerOpts } from '../../vpc';

// Get account ID
const accountId = pulumi.output(
  aws.getCallerIdentity({ async: true, ...providerOpts })
).accountId;

//  Assume role for Role Based Access Control
const assumeRolePolicy = accountId.apply((id) =>
  JSON.stringify({
    Version: '2012-10-17',
    Statement: [
      {
        Sid: '',
        Effect: 'Allow',
        Principal: {
          AWS: `arn:aws:iam::${id}:user/dean`,
        },
        Action: 'sts:AssumeRole',
      },
    ],
  })
);

// AWS IAM clusterAdminRole with full access to all AWS resources
export const clusterAdminRole = new aws.iam.Role(
  `AdminRole`,
  {
    assumeRolePolicy,
    tags: {
      clusterAccess: `AdminRole-user`,
    },
  },
  { ...providerOpts }
);

// Automation role for EKS cluster to connect with github actions, gitlab CI, etc.
export const automationRole = new aws.iam.Role(
  `AutomationRole`,
  {
    assumeRolePolicy,
    tags: {
      clusterAccess: `AutomationRole-user`,
    },
  },
  { ...providerOpts }
);

// Role for any Production users.
export const prodEnvRole = new aws.iam.Role(
  `ProdEnvRole`,
  {
    assumeRolePolicy,
    tags: {
      clusterAccess: `ProdEnvRole-user`,
    },
  },
  { ...providerOpts }
);

// Admin instance profile
const adminProfile = new aws.iam.InstanceProfile(
  'instance-profile-1',
  {
    role: clusterAdminRole,
  },
  { ...providerOpts }
);

// Automation instance profile
const automationProfile = new aws.iam.InstanceProfile(
  'instance-profile-2',
  {
    role: automationRole,
  },
  { ...providerOpts }
);

// Create an EKS cluster inside of the VPC.
const kubeconfigOpts: eks.KubeconfigOptions = { profileName: 'mfaPersonal' };

export const cluster = new eks.Cluster(
  'dev-cluster-for-all',
  {
    providerCredentialOpts: kubeconfigOpts,
    vpcId: vpcId,
    privateSubnetIds: subnetIds,
    nodeAssociatePublicIpAddress: false,
    clusterSecurityGroup: sg,
    endpointPublicAccess: true,
    skipDefaultNodeGroup: true,
    enabledClusterLogTypes: ['api', 'audit', 'authenticator'],
    roleMappings: [
      {
        groups: ['system:masters'],
        roleArn: clusterAdminRole.arn,
        username: 'admin-user',
      },
      {
        groups: ['pulumi:automation-group'],
        roleArn: automationRole.arn,
        username: 'automation-user',
      },
      {
        groups: ['pulumi:prod-group'],
        roleArn: prodEnvRole.arn,
        username: 'prod-user',
      },
    ],
  },
  providerOpts
);

// Create a node group for fixed compute, if needed
const fixedNodeGroup = cluster.createNodeGroup('dev-cluster-fixed-ng', {
  nodeSubnetIds: subnetIds,
  instanceType: 't2.medium',
  desiredCapacity: 2,
  minSize: 1,
  maxSize: 2,
  labels: { ondemand: 'true' },
  instanceProfile: adminProfile,
});

/** Create a node group for spot compute, if needed.
 * *************************************************
 * I'm not going to use this for now, but it's here for reference.
 * I'm not sure if spot instances are still supported in EKS.

const spotNodeGroup = new eks.NodeGroup(
  'dev-cluster-spot-ng',
  {
    cluster: cluster,
    nodeSubnetIds: subnetIds,
    instanceType: 't2.medium',
    desiredCapacity: 1,
    spotPrice: '1',
    minSize: 1,
    maxSize: 2,
    labels: { preemptible: 'true' },
    taints: {
      special: {
        value: 'true',
        effect: 'NoSchedule',
      },
    },
    kubeletExtraArgs: '--alsologtostderr',
    bootstrapExtraArgs: '--aws-api-retry-attempts 10',
    instanceProfile: adminProfile,
  },
  {
    providers: { kubernetes: cluster.provider },
  }
);
*/

// Create Dev Namespace
const nsDev = new k8s.core.v1.Namespace(
  'dev',
  { metadata: { name: 'dev' } },
  { provider: cluster.provider }
);

// Create Prod Namespace
const nsProd = new k8s.core.v1.Namespace(
  'prod',
  { metadata: { name: 'prod' } },
  { provider: cluster.provider }
);

// Grant cluster admin access to all admins with k8s ClusterRole and ClusterRoleBinding
new k8s.rbac.v1.ClusterRole(
  'clusterAdminRole',
  {
    metadata: {
      name: 'clusterAdminRole',
    },
    rules: [
      {
        apiGroups: ['*'],
        resources: ['*'],
        verbs: ['*'],
      },
    ],
  },
  { provider: cluster.provider }
);

new k8s.rbac.v1.ClusterRoleBinding(
  'cluster-admin-binding',
  {
    metadata: {
      name: 'cluster-admin-binding',
    },
    subjects: [
      {
        kind: 'User',
        name: 'admin-user',
      },
    ],
    roleRef: {
      kind: 'ClusterRole',
      name: 'clusterAdminRole',
      apiGroup: 'rbac.authorization.k8s.io',
    },
  },
  { provider: cluster.provider }
);

// automation-user for users that have permissions to all k8s resources in the namespace automation
new k8s.rbac.v1.Role(
  'automationRole',
  {
    metadata: {
      name: 'automationRole',
      namespace: 'automation',
    },
    rules: [
      {
        apiGroups: ['*'],
        resources: ['*'],
        verbs: ['*'],
      },
    ],
  },
  { provider: cluster.provider }
);

new k8s.rbac.v1.RoleBinding(
  'automation-binding',
  {
    metadata: {
      name: 'automation-binding',
      namespace: 'automation',
    },
    subjects: [
      {
        kind: 'User',
        name: 'automation-user',
        apiGroup: 'rbac.authorization.k8s.io',
      },
    ],
    roleRef: {
      kind: 'Role',
      name: 'AutomationRole',
      apiGroup: 'rbac.authorization.k8s.io',
    },
  },
  { provider: cluster.provider }
);

// prod-usr for users that have read access to all k8s resources in  the namespace prod
new k8s.rbac.v1.Role(
  'prodEnvRole',
  {
    metadata: {
      name: 'prodEnvRole',
      namespace: 'prod',
    },
    rules: [
      {
        apiGroups: ['*'],
        resources: ['*'],
        verbs: ['get', 'watch', 'list'],
      },
    ],
  },
  { provider: cluster.provider }
);

new k8s.rbac.v1.RoleBinding(
  'prod-env-binding',
  {
    metadata: {
      name: 'prod-env-binding',
      namespace: 'prod',
    },
    subjects: [
      {
        kind: 'User',
        name: 'prod-user',
        apiGroup: 'rbac.authorization.k8s.io',
      },
    ],
    roleRef: {
      kind: 'Role',
      name: 'ProdEnvRole',
      apiGroup: 'rbac.authorization.k8s.io',
    },
  },
  { provider: cluster.provider }
);

// Export the cluster's kubeconfig.
export const kubeconfig = cluster.kubeconfig;

// Export cluster Provider to use in rbac
export const clusterProvider = cluster.provider;

//export cluster name
export const clusterName = cluster.eksCluster.name;

//export node groups
export const fixedNG = fixedNodeGroup;
// export const spotNG = spotNodeGroup;

//export namespaces
export const nsDevName = nsDev.metadata.apply((m) => m.name);
export const nsProdName = nsProd.metadata.apply((m) => m.name);
