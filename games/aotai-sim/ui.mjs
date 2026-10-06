// Pagination keeps every option reachable without adding document scrolling.
export function layoutFor(width=1440,height=900){
  const compact=width<=760||height<820;
  return {
    choices:compact?2:4,
    shop:height<540?2:width>=1100&&height>=760?6:4,
    utilities:height<620?4:8,
    bag:Math.max(2,Math.min(width<=760?4:6,Math.floor((height-210)/78))),
    journal:compact?2:4,
    achievements:compact?2:4,
    feedback:compact?3:5,
    scenarios:width<=760?1:3,
    backpacks:width<=760?1:3
  };
}
export function pageSlice(items,page=0,size=4){
  const per=Math.max(1,Math.trunc(size)||1),total=Math.max(1,Math.ceil(items.length/per));
  const current=Math.min(total-1,Math.max(0,Math.trunc(page)||0)),start=current*per;
  return {items:items.slice(start,start+per),page:current,total,start,count:items.length};
}
