/**
 * TASK:
 * A single EKS cluster in all subnets, with public endpoint access enabled
 */
import * as aws from "@pulumi/aws";
import * as eks from '@pulumi/eks';

import { vpcId, subnetIds, igwId, ngwIds, albId, rtaIds, sg, providerOpts } from '../vpc';

const managedPolicyArns: string[] = [
  'arn:aws:iam::aws:policy/AmazonEKSWorkerNodePolicy',
  'arn:aws:iam::aws:policy/AmazonEKS_CNI_Policy',
  'arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryReadOnly',
];

// Creates a role and attaches the EKS worker node IAM managed policies.
export function createRole(name: string): aws.iam.Role {
    const role = new aws.iam.Role(name, {
        assumeRolePolicy: aws.iam.assumeRolePolicyForPrincipal({
            Service: "ec2.amazonaws.com",
        }),
    });

    let counter = 0;
    for (const policy of managedPolicyArns) {
        // Create RolePolicyAttachment
        const rpa = new aws.iam.RolePolicyAttachment(`${name}-policy-${counter++}`,
            { policyArn: policy, role: role },
        );
    }

    return role;
}

// Create the roles and instance profiles for the two worker groups.
const workerGroupRole1 = createRole("workerGroup-1-role");
const workerGroupRole2 = createRole("workerGroup-2-role");
const instanceProfile1 = new aws.iam.InstanceProfile('instance-profile-1', {
  role: workerGroupRole1,
});
const instanceProfile2 = new aws.iam.InstanceProfile('instance-profile-2', {
  role: workerGroupRole2,
});


// Create an EKS cluster inside of the VPC.
const cluster = new eks.Cluster(
  'dev-cluster-for-all',
  {
    vpcId: vpcId,
    privateSubnetIds: subnetIds,
    nodeAssociatePublicIpAddress: false,
    clusterSecurityGroup: sg,
    endpointPublicAccess: true,
    skipDefaultNodeGroup: true,
    instanceRoles: [workerGroupRole1, workerGroupRole2],
  },
  providerOpts
);

// Create a node group for fixed compute, if needed
const fixedNodeGroup = cluster.createNodeGroup("dev-cluster-fixed-ng", {
    instanceType: "t2.medium",
    desiredCapacity: 2,
    minSize: 1,
    maxSize: 3,
    labels: {"ondemand": "true"},
    instanceProfile: instanceProfile1,
});

// Create a node group for spot compute, if needed
const spotNodeGroup = new eks.NodeGroup(
  'dev-cluster-spot-ng',
  {
    cluster: cluster,
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
    instanceProfile: instanceProfile2,
  },
  {
    providers: { kubernetes: cluster.provider },
  }
);

// Export the cluster's kubeconfig.
export const kubeconfig = cluster.kubeconfig;
