import { backend } from './backendClient';

const invoke = (name, payload) => backend.functions.invoke(name, payload);

export const listAppFiles = (payload) => invoke('listAppFiles', payload);
export const getFileContent = (payload) => invoke('getFileContent', payload);
export const updateFileContent = (payload) => invoke('updateFileContent', payload);
export const createAppFile = (payload) => invoke('createAppFile', payload);
export const exportAppToZip = (payload) => invoke('exportAppToZip', payload);
export const inviteUser = (payload) => invoke('inviteUser', payload);
export const createEntity = (payload) => invoke('createEntity', payload);
export const updateEntity = (payload) => invoke('updateEntity', payload);
export const generateAppCode = (payload) => invoke('generateAppCode', payload);
export const generateEntitySchema = (payload) => invoke('generateEntitySchema', payload);
export const renderLivePage = (payload) => invoke('renderLivePage', payload);
export const createAPIKey = (payload) => invoke('createAPIKey', payload);
export const revokeAPIKey = (payload) => invoke('revokeAPIKey', payload);
export const toggleAPIKey = (payload) => invoke('toggleAPIKey', payload);
export const executeTriggers = (payload) => invoke('executeTriggers', payload);
export const createWithTriggers = (payload) => invoke('createWithTriggers', payload);
export const updateWithTriggers = (payload) => invoke('updateWithTriggers', payload);
export const deleteWithTriggers = (payload) => invoke('deleteWithTriggers', payload);
export const processScheduledTasks = (payload) => invoke('processScheduledTasks', payload);
export const executePowerShellScript = (payload) => invoke('executePowerShellScript', payload);
export const executeCustomScript = (payload) => invoke('executeCustomScript', payload);
export const runTestCase = (payload) => invoke('runTestCase', payload);
export const generateTestCase = (payload) => invoke('generateTestCase', payload);
export const runTestSuite = (payload) => invoke('runTestSuite', payload);
export const runWorkflow = (payload) => invoke('runWorkflow', payload);
