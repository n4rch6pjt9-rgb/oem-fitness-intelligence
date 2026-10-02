// Parameters observed in the BRTW shop. Tracking parameters are not identity.
export function listingUrl(origin, group = '', page = 1) {
  if (!Number.isInteger(page) || page < 1 || page > 10000) throw new Error('Página inválida.');
  const url = new URL('/productList', origin);
  const params = {username:'',pageNumber:String(page),pageSize:'48',viewType:'1',isByGroup:group?'1':'0',pageUrlFrom:'1',productGroupOrCatId:group,searchKeyword:'',searchKeywordSide:'',searchKeywordList:'',selectedFeaturedType:'',selectedSpotlightId:'',viewPageSize:'48'};
  url.search = new URLSearchParams(params).toString();
  return url.href;
}
