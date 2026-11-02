// Independent JavaScript reference for owner-approved R-059, not a live handler.
// Since P7-04 the Next.js handler is retired: activityAnswer builds the
// signed-in answer's status, headers and query itself. On the 400 generated
// inputs it was checked identical to the answers built on the real handler
// before that handler was removed.

// activityAnswer is the reference answer to one signed-in fixture.
export function activityAnswer(f) {
  return activityModel(f, {
    status: 200,
    body: {},
    content_type: 'application/json',
    cache_control: null,
    query: [
      ['from', 'activity_logs'],
      ['select', 'activity_date, activity_count'],
      ['eq', 'user_id', f.user.id],
      ['gte', 'activity_date', ''],
      ['lte', 'activity_date', new Date(f.now).toISOString().slice(0, 10)],
      ['order', 'activity_date', { ascending: true }],
    ],
  });
}

export function activityModel(f, answer) {
  const out=structuredClone(answer);
  if(!out.query.length)return out;
  const to=new Date(f.now),from=new Date(f.now);
  from.setUTCDate(from.getUTCDate()-365);from.setUTCDate(from.getUTCDate()-from.getUTCDay());
  for(const step of out.query)if(step[0]==='gte')step[2]=from.toISOString().slice(0,10);
  if(out.status!==200)return out;
  const counts=new Map();let total=0;
  for(const row of f.rows??[]){const n=row?.activity_count||0;total+=n;counts.set(row?.activity_date,(counts.get(row?.activity_date)||0)+n);}
  const grid=[];let week=[],max=0,active=0,real=0;
  for(const d=new Date(from);d<=to;d.setUTCDate(d.getUTCDate()+1)){
    const date=d.toISOString().slice(0,10),n=counts.get(date)||0;
    const color=n===0?'#161b22':n/25<=.25?'#0e4429':n/25<=.5?'#006d32':n/25<=.75?'#26a641':'#39d353';
    max=Math.max(max,n);if(n>0)active++;real++;
    week.push([date,n,color,grid.length,d.getUTCDay()]);if(d.getUTCDay()===6){grid.push(week);week=[];}
  }
  if(week.length){while(week.length<7)week.push(['',0,'#161b22',grid.length,week.length]);grid.push(week);}
  const days=grid.flat().filter(d=>d[0]);let i=days.length-1,streak=0;if(!(days[i]?.[1]>0))i--;
  while(i>=0&&days[i][1]>0){streak++;i--;}
  out.body={grid,stats:{maxCount:max,totalContributions:total,currentStreak:streak,averagePerDay:Number((total/real).toFixed(1)),activeDays:active,totalDays:real}};
  return JSON.parse(JSON.stringify(out));
}
