// Synthetic fixtures for M1. Versions are examples, not current GitHub releases.
export function seedData() {
 return {
  users:[{id:1,name:'Omer',email:'admin@homelab.example',role:'admin'},{id:2,name:'Mina',email:'user@homelab.example',role:'user'}],
  servers:[{id:1,name:'atlas',hostname:'192.168.1.10',purpose:'Media and documents',notes:'Primary household services. Maintenance window: Sunday evening.'},{id:2,name:'beacon',hostname:'192.168.1.20',purpose:'Developer tools',notes:'Internal developer services and experiments.'}],
  applications:[
   {id:1,name:'Immich',description:'Photo and video library.',github_owner:'immich-app',github_repo:'immich',notes:'Review release notes before upgrading.'},
   {id:2,name:'Paperless-ngx',description:'Searchable document archive.',github_owner:'paperless-ngx',github_repo:'paperless-ngx',notes:'Keep a copy of the export outside the server.'},
   {id:3,name:'Gitea',description:'Internal Git hosting.',github_owner:'go-gitea',github_repo:'gitea',notes:'Back up repositories and database together.'},
   {id:4,name:'Uptime Kuma',description:'Self-hosted status application.',github_owner:'louislam',github_repo:'uptime-kuma',notes:'This ledger does not query or monitor this service.'}
  ],
  deployments:[
   {id:1,application_id:1,server_id:1,label:'production',installed_version:'v1.118.2',url:'https://immich.home.example',status:'running',deployed_on:'2026-10-12',notes:'Household photo library.'},
   {id:2,application_id:2,server_id:1,label:'production',installed_version:'v2.12.0',url:'https://paperless.home.example',status:'running',deployed_on:'2026-10-14',notes:'Document archive for the household.'},
   {id:3,application_id:3,server_id:2,label:'internal',installed_version:'v1.22.3',url:'https://git.home.example',status:'running',deployed_on:'2026-10-08',notes:'Private repositories for lab projects.'},
   {id:4,application_id:4,server_id:2,label:'internal',installed_version:'v1.23.15',url:'https://kuma.home.example',status:'stopped',deployed_on:'2026-10-09',notes:'Manually recorded as stopped; not a live status check.'}
  ],
  maintenance:[
   {id:1,title:'Review Paperless release notes',description:'Check migration notes before deciding whether to update.',server_id:null,deployment_id:2,assigned_user_id:1,status:'open',due_on:'2026-10-28',completed_at:null,outcome:''},
   {id:2,title:'Verify backup restore',description:'Restore an export to a disposable test environment.',server_id:null,deployment_id:2,assigned_user_id:1,status:'open',due_on:'2026-10-30',completed_at:null,outcome:''},
   {id:3,title:'Document the developer services',description:'Check the purpose and interface URLs in the ledger.',server_id:2,deployment_id:null,assigned_user_id:2,status:'in_progress',due_on:'2026-11-01',completed_at:null,outcome:''},
   {id:4,title:'Record the storage layout',description:'List the volumes used for media and documents.',server_id:1,deployment_id:null,assigned_user_id:1,status:'completed',due_on:'2026-10-20',completed_at:'2026-10-20T15:00:00Z',outcome:'Documented the volume layout in the server notes.'}
  ]
 };
}
