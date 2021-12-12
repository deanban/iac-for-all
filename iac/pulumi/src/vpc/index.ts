/**
 * 1. A VPC with a 10.0.0.0/16 CIDR, DNS support, ..
 *   .. an Internet Gateway, and NAT Gateways for 3 availability zones.
 * 2. 3 /24 private subnets associated with the above NAT Gateways.
 * 3. AWS Load Balancer controller with Public-facing ALB
 */

import * as pulumi from '@pulumi/pulumi';
import * as aws from '@pulumi/aws';

const config = new pulumi.Config('aws');
export const providerOpts = {
  provider: new aws.Provider('devProvider', {
    region: <aws.Region>config.require('region'),
  }),
};

const vpc = new aws.ec2.Vpc(
  'vpcForAll',
  {
    cidrBlock: '10.0.0.0/16',
    enableDnsHostnames: true,
    enableDnsSupport: true,
    tags: {
      name: 'vpcForAll',
      environment: 'dev',
    }
  },
  providerOpts
);

export const sg = new aws.ec2.SecurityGroup('sgAllowTLS', {
  description: 'Allow TLS inbound traffic',
  vpcId: vpc.id,
  ingress: [
    {
      description: 'TLS from VPC',
      fromPort: 443,
      toPort: 443,
      protocol: 'tcp',
    },
  ],
  egress: [
    {
      fromPort: 0,
      toPort: 0,
      protocol: '-1',
      cidrBlocks: ['0.0.0.0/0'],
      ipv6CidrBlocks: ['::/0'],
    },
  ],
  tags: {
    name: 'sgAllowTLS',
    vpcId: vpc.id,
    environment: 'dev',
  },
}, providerOpts);


const igw = new aws.ec2.InternetGateway(
  'internetGatewayForAll',
  {
    vpcId: vpc.id,
    tags: {
      name: 'internetGatewayForAll',
      vpcId: vpc.id,
      environment: 'dev',
    }
  },
  providerOpts
);


const routeTable = new aws.ec2.RouteTable(
  'routeTableForAll',
  {
    vpcId: vpc.id,
    routes: [
      {
        cidrBlock: '0.0.0.0/0',
        gatewayId: igw.id,
      },
    ],
    tags: {
      name: 'routeTableForAll',
      vpcId: vpc.id,
      environment: 'dev',
    }
  },
  providerOpts
);

const subnet0 = new aws.ec2.Subnet(
  'subnet0ForAll',
  {
    vpcId: vpc.id,
    availabilityZone: aws
      .getAvailabilityZones(undefined, { ...providerOpts, async: true })
      .then((azs) => azs.names[0]),
    cidrBlock: '10.0.0.0/24',
    tags: {
      name: 'subnet0ForAll',
      vpcId: vpc.id,
      environment: 'dev',
    }
  },
  providerOpts
);

const subnet1 = new aws.ec2.Subnet(
  'subnet1ForAll',
  {
    vpcId: vpc.id,
    availabilityZone: aws
      .getAvailabilityZones(undefined, { ...providerOpts, async: true })
      .then((azs) => azs.names[1]),
    cidrBlock: '10.0.1.0/24',
    tags: {
      name: 'subnet1ForAll',
      vpcId: vpc.id,
      environment: 'dev',
    },
  },
  providerOpts
);

const subnet2 = new aws.ec2.Subnet(
  'subnet2ForAll',
  {
    vpcId: vpc.id,
    availabilityZone: aws
      .getAvailabilityZones(undefined, { ...providerOpts, async: true })
      .then((azs) => azs.names[2]),
    cidrBlock: '10.0.2.0/24',
    tags: {
      name: 'subnet2ForAll',
      vpcId: vpc.id,
      environment: 'dev',
    },
  },
  providerOpts
);

const routeTableAssociation0 = new aws.ec2.RouteTableAssociation(
  'routeTableAssociation0ForAll',
  {
    subnetId: subnet0.id,
    routeTableId: routeTable.id
  },
  providerOpts
);

const routeTableAssociation1 = new aws.ec2.RouteTableAssociation(
  'routeTableAssociation1ForAll',
  {
    subnetId: subnet1.id,
    routeTableId: routeTable.id,
  },
  providerOpts
);

const routeTableAssociation2 = new aws.ec2.RouteTableAssociation(
  'routeTableAssociation2ForAll',
  {
    subnetId: subnet2.id,
    routeTableId: routeTable.id,
  },
  providerOpts
);

const alb = new aws.lb.LoadBalancer(
  'albForAll',
  {
    loadBalancerType: 'application',
    enableCrossZoneLoadBalancing: true,
    internal: false,
    subnets: [subnet0.id, subnet1.id, subnet2.id],
    tags: {
      name: 'albForAll',
      environment: 'dev',
    },
    securityGroups: [sg.id],
  },
  providerOpts
);


const natGateway0 = new aws.ec2.NatGateway(
  'natGateway0ForAll',
  {
    connectivityType: 'private',
    subnetId: subnet0.id,
    tags: {
      name: 'natGateway0ForAll',
      subnetId: subnet0.id,
      environment: 'dev',
    },
  },
  providerOpts
);

const natGateway1 = new aws.ec2.NatGateway(
  'natGateway1ForAll',
  {
    connectivityType: 'private',
    subnetId: subnet1.id,
    tags: {
      name: 'natGateway1ForAll',
      subnetId: subnet1.id,
      environment: 'dev',
    },
  },
  providerOpts
);

const natGateway2 = new aws.ec2.NatGateway(
  'natGateway2ForAll',
  {
    connectivityType: 'private',
    subnetId: subnet2.id,
    tags: {
      name: 'natGateway2ForAll',
      subnetId: subnet2.id,
      environment: 'dev',
    },
  },
  providerOpts
);

export const vpcId = vpc.id;
export const subnetIds = [subnet0.id, subnet1.id, subnet2.id];
export const sgId = sg.id;
export const albId = alb.id;
export const igwId = igw.id;
export const rtaIds = [routeTableAssociation0.id, routeTableAssociation1.id, routeTableAssociation2.id];
export const ngwIds = [natGateway0.id, natGateway1.id, natGateway2.id];
