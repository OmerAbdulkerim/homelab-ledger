export const entities = {
 servers:{singular:'server',label:'Servers',fields:[
  {name:'name',label:'Name',required:true,max:80},
  {name:'hostname',label:'Hostname or IP address',required:true,max:253},
  {name:'purpose',label:'Purpose',required:true,max:200},
  {name:'notes',label:'Notes',type:'textarea',max:5000}
 ]},
 applications:{singular:'application',label:'Applications',fields:[
  {name:'name',label:'Name',required:true,max:80},
  {name:'description',label:'Description',required:true,max:500},
  {name:'github_owner',label:'GitHub owner',max:100,hint:'Optional. Provide both owner and repository, or leave both blank.'},
  {name:'github_repo',label:'GitHub repository',max:100},
  {name:'notes',label:'Notes',type:'textarea',max:5000}
 ]}
};
entities.deployments={singular:'deployment',label:'Deployments',fields:[
 {name:'application_id',label:'Application',type:'select',required:true,options:data=>[['','Choose an application'],...data.applications.map(row=>[row.id,row.name])]},
 {name:'server_id',label:'Server',type:'select',required:true,options:data=>[['','Choose a server'],...data.servers.map(row=>[row.id,row.name])]},
 {name:'label',label:'Environment / label',required:true,max:80,hint:'For example: production, staging or internal.'},
 {name:'status',label:'Recorded status',type:'select',required:true,options:[['planned','planned'],['running','running'],['stopped','stopped']]},
 {name:'installed_version',label:'Installed version',max:100,hint:'Record the exact tag or version. Required unless planned.'},
 {name:'url',label:'Web interface URL',type:'url',max:2048,hint:'Optional HTTP(S) URL. No embedded credentials.'},
 {name:'deployed_on',label:'Deployment date',type:'date'},
 {name:'notes',label:'Notes',type:'textarea',max:5000}
]};
