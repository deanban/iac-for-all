import { vpcId, subnetIds, igwId, ngwIds, albId, rtaIds, sgId } from './vpc';
import {
  clstrName,
  kConfig,
  fixedNodeG,
  // spotNodeG,
  caRole,
  amRole,
  prodRole,
  nsDev,
  nsProd,
  deployment1,
  ingressSvc,
  ingressAddr,
  ingressHost
} from './eks';

// // All vpc resources
export const vpc = vpcId;
export const subnet = subnetIds;
export const igw = igwId;
export const ngw = ngwIds;
export const alb = albId;
export const rta = rtaIds;
export const sg = sgId;

// // All eks resources
export const nsDevName = nsDev;
export const nsPrdName = nsProd;
export const clusterName = clstrName;
export const k8sConfig = kConfig;
export const fixedNG = fixedNodeG;
// export const spotNG = spotNodeG;
export const caRoleName = caRole;
export const atmRoleName = amRole;
export const prdRoleName = prodRole;

export const deployment = deployment1;
export const nginxSvcStatus = ingressSvc;
export const nginxSvcAddr = ingressAddr;
export const nginxSvcHost = ingressHost;
