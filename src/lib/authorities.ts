/**
 * Who to tag on X when a spot is shared with the authorities: the city's civic body
 * (if we know its official handle) and the state Chief Minister's office.
 *
 * We tag the CM's OFFICE handle, which stays the same when the CM changes.
 * Handles can change: check them before each release. A city with no `civic` handle
 * simply tags the state office only.
 */
interface Authority {
  state: string;
  /** Civic body handle, without the @. */
  civic?: string;
  /** Chief Minister's office handle, without the @. */
  cm: string;
}

export const AUTHORITIES: Record<string, Authority> = {
  bengaluru: { state: 'Karnataka', civic: 'BBMPCOMM', cm: 'CMofKarnataka' },
  mysuru: { state: 'Karnataka', cm: 'CMofKarnataka' },
  mangaluru: { state: 'Karnataka', cm: 'CMofKarnataka' },
  hubballi: { state: 'Karnataka', cm: 'CMofKarnataka' },
  mumbai: { state: 'Maharashtra', civic: 'mybmc', cm: 'CMOMaharashtra' },
  pune: { state: 'Maharashtra', civic: 'PMCPune', cm: 'CMOMaharashtra' },
  delhi: { state: 'Delhi', civic: 'MCD_Delhi', cm: 'CMODelhi' },
  chennai: { state: 'Tamil Nadu', civic: 'chennaicorp', cm: 'CMOTamilNadu' },
  coimbatore: { state: 'Tamil Nadu', cm: 'CMOTamilNadu' },
  hyderabad: { state: 'Telangana', civic: 'GHMCOnline', cm: 'TelanganaCMO' },
  ahmedabad: { state: 'Gujarat', cm: 'CMOGuj' },
  jaipur: { state: 'Rajasthan', cm: 'RajCMO' },
  lucknow: { state: 'Uttar Pradesh', cm: 'CMOfficeUP' },
  kochi: { state: 'Kerala', cm: 'CMOKerala' },
  indore: { state: 'Madhya Pradesh', cm: 'CMMadhyaPradesh' },
  bhopal: { state: 'Madhya Pradesh', cm: 'CMMadhyaPradesh' },
};

/** The "compose a post" link for X, with the civic body and the CM's office tagged. */
export function xShareUrl(opts: { cityId: string; cityName: string; locality: string; type: string; link: string }): string {
  const a = AUTHORITIES[opts.cityId];
  const tags = [a?.civic, a?.cm].filter(Boolean).map((h) => `@${h}`).join(' ');
  const place = [opts.locality, opts.cityName].filter(Boolean).join(', ');
  const text = `${tags ? tags + ' ' : ''}${opts.type} in ${place} needs cleaning. Reported by citizens on SaafSaathi:\n${opts.link}\n#SaafSaathi #SwachhBharat`;
  return `https://x.com/intent/post?text=${encodeURIComponent(text)}`;
}
