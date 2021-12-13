import {
  clusterName,
  kubeconfig,
  fixedNG,
  // spotNG,
  clusterAdminRole,
  automationRole,
  prodEnvRole,
  nsDevName,
  nsProdName
} from './cluster';

import { deploymentName, ingressService, ingressAddress, ingressHostname } from './deployments';


export const clstrName = clusterName;
export const kConfig = kubeconfig;
export const fixedNodeG = fixedNG;
// export const spotNodeG = spotNG;


export const caRole = clusterAdminRole;
export const amRole = automationRole;
export const prodRole = prodEnvRole;

export const nsDev = nsDevName;
export const nsProd = nsProdName;

export const deployment1 = deploymentName;
export const ingressSvc = ingressService;
export const ingressAddr = ingressAddress;
export const ingressHost = ingressHostname;

