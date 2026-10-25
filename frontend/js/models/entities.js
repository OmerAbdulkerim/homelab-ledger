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
