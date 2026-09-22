export function workflowCapacity(levels,users){
 const slots=[]
 for(const l of levels)for(let i=0;i<Number(l.required_approvals||1);i++)slots.push({level_no:l.level_no,required_role:l.required_role})
 const eligible=slot=>users.filter(u=>u.active&&(u.app_role===slot.required_role||['Super Admin','IMS Admin'].includes(u.app_role))).map(u=>String(u.id))
 const match=new Map()
 function assign(slotIndex,seen){
  for(const userId of eligible(slots[slotIndex])){
   if(seen.has(userId))continue
   seen.add(userId)
   const previous=match.get(userId)
   if(previous===undefined||assign(previous,seen)){match.set(userId,slotIndex);return true}
  }
  return false
 }
 for(let i=0;i<slots.length;i++)if(!assign(i,new Set()))return {ok:false,required_slots:slots.length,staffed_slots:i}
 return {ok:true,required_slots:slots.length,staffed_slots:slots.length}
}
