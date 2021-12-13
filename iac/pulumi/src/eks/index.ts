import {
  clusterName,
  kubeconfig,
  fixedNG,
  // spotNG,
  clusterAdminRole,
  automationRole,
  prodEnvRole,
  nsDevName,
  nsProdName,
} from './cluster';

import {
  appStatuses,
  controllerStatus,
  ingressAddress,
  ingressHostname,
} from './deployments';

export const clstrName = clusterName;
export const kConfig = kubeconfig;
export const fixedNodeG = fixedNG;
// export const spotNodeG = spotNG;

export const caRole = clusterAdminRole;
export const amRole = automationRole;
export const prodRole = prodEnvRole;

export const nsDev = nsDevName;
export const nsProd = nsProdName;

export const appStatus = appStatuses;
export const ctrlStatus = controllerStatus;
export const ingressAddr = ingressAddress;
export const ingressHost = ingressHostname;
