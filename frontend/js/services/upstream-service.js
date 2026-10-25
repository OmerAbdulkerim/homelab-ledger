// Static, synthetic API states. M3 will replace this service's source with our
// PHP endpoint; views/controllers will never call GitHub directly.
const sampleReleases={
 'immich-app/immich':{tag:'v1.119.0',language:'TypeScript'},
 'paperless-ngx/paperless-ngx':{tag:'v2.13.0',language:'Python'},
 'go-gitea/gitea':{tag:'v1.22.4',language:'Go'},
 'louislam/uptime-kuma':{tag:'v1.23.16',language:'JavaScript'}
};
export async function getUpstream(application,mode='sample') {
 await new Promise(resolve=>setTimeout(resolve,250));
 if(!application.github_owner||!application.github_repo)return {state:'unlinked'};
 if(mode==='failure')return {state:'failure',message:'GitHub is unavailable in this simulated failure. Your inventory is still usable.'};
 const name=`${application.github_owner}/${application.github_repo}`;
 const repositoryUrl=`https://github.com/${encodeURIComponent(application.github_owner)}/${encodeURIComponent(application.github_repo)}`;
 if(mode==='no-release'||!sampleReleases[name])return {state:'no-release',name,repositoryUrl};
 return {state:'sample',name,repositoryUrl,releaseUrl:`${repositoryUrl}/releases`,published:'2026-10-21',...sampleReleases[name]};
}
