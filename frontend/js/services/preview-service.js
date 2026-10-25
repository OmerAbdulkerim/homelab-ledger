// M1 sample data only. No request to a PHP or GitHub endpoint is made.
export function deploymentPreview() {
 return {
  user: {name:'Omer', role:'admin'},
  deployments:[['Immich','atlas'],['Paperless-ngx','atlas'],['Gitea','beacon'],['Uptime Kuma','beacon']]
 };
}
