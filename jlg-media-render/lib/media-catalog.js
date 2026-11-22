'use strict';
// Catalog of mainstream newsrooms accepted for research / verification.
// Inclusion is not an endorsement of the outlet; political claims always need corroboration.
// A title may be an editorial reference without a feed license.
const GENERAL=[
 {name:'BFMTV',family:'RMC BFM',url:'https://www.bfmtv.com/',type:'television',discovery:true},
 {name:'TF1 INFO',family:'TF1',url:'https://www.tf1info.fr/',type:'television',discovery:true},
 {name:'LCI',family:'TF1',url:'https://www.tf1info.fr/direct/',type:'television'},
 {name:'franceinfo',family:'France Télévisions/Radio France',url:'https://www.francetvinfo.fr/',type:'audiovisuel',direct:true},
 {name:'France 2',family:'France Télévisions',url:'https://www.france.tv/france-2/',type:'television'},
 {name:'France 3',family:'France Télévisions',url:'https://france3-regions.franceinfo.fr/',type:'television',direct:true},
 {name:'France 24',family:'France Médias Monde',url:'https://www.france24.com/fr/',type:'television',direct:true},
 {name:'RFI',family:'France Médias Monde',url:'https://www.rfi.fr/fr/',type:'radio',direct:true},
 {name:'France Inter',family:'Radio France',url:'https://www.radiofrance.fr/franceinter',type:'radio'},
 {name:'France Culture',family:'Radio France',url:'https://www.radiofrance.fr/franceculture',type:'radio'},
 {name:'RTL',family:'M6',url:'https://www.rtl.fr/',type:'radio',discovery:true},
 {name:'Le Figaro',family:'Groupe Figaro',url:'https://www.lefigaro.fr/',type:'presse',direct:true},
 {name:'Le Monde',family:'Groupe Le Monde',url:'https://www.lemonde.fr/',type:'presse',researchOnly:true,rightsNote:'Flux RSS réservés à un usage strictement personnel et non collectif ; consultation manuelle et citations seulement sans contrat de syndication'},
 {name:'Libération',family:'Libération',url:'https://www.liberation.fr/',type:'presse'},
 {name:'La Croix',family:'Bayard',url:'https://www.la-croix.com/',type:'presse'},
 {name:'Les Échos',family:'Les Échos-Le Parisien',url:'https://www.lesechos.fr/',type:'presse',discovery:true},
 {name:'Le Parisien',family:'Les Échos-Le Parisien',url:'https://www.leparisien.fr/',type:'presse',discovery:true},
 {name:'Ouest-France',family:'Ouest-France',url:'https://www.ouest-france.fr/',type:'presse',discovery:true},
 {name:'Sud Ouest',family:'Groupe Sud Ouest',url:'https://www.sudouest.fr/',type:'presse',discovery:true},
 {name:'La Montagne',family:'Centre France',url:'https://www.lamontagne.fr/',type:'presse'},
 {name:'ICI Limousin',family:'Radio France',url:'https://www.ici.fr/',type:'radio',direct:true},
 {name:'France 3 Corrèze',family:'France Télévisions',url:'https://france3-regions.franceinfo.fr/nouvelle-aquitaine/correze',type:'regional',direct:true}
];
const SPORT=[
 {name:'RMC Sport',family:'RMC BFM',url:'https://rmcsport.bfmtv.com/',type:'sport',discovery:true},
 {name:"L'Équipe",family:"L'Équipe",url:'https://www.lequipe.fr/',type:'sport',discovery:true},
 {name:'Midi Olympique',family:'La Dépêche',url:'https://www.midi-olympique.fr/',type:'rugby',discovery:true},
 {name:'Rugbyrama',family:'La Dépêche',url:'https://www.rugbyrama.fr/',type:'rugby',discovery:true},
 {name:'FFHandball',family:'FFHandball',url:'https://www.ffhandball.fr/',type:'primary'},
 {name:'LNR',family:'LNR',url:'https://www.lnr.fr/',type:'primary'},
 {name:'EHF',family:'EHF',url:'https://www.eurohandball.com/',type:'primary'}
];
const OUTLETS=[...GENERAL,...SPORT];
const normalize=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,'');
function identity(publisher){
 const n=normalize(publisher);
 const entry=OUTLETS.find(x=>normalize(x.name)===n);
 if(entry)return entry;
 if(n.includes('france3'))return GENERAL.find(x=>x.name==='France 3');
 if(n==='ici'||n==='icilimousin')return GENERAL.find(x=>x.name==='ICI Limousin');
 if(n==='bfm'||n==='bfmtv')return GENERAL[0];
 if(n==='rmcsport')return SPORT[0];
 if(n==='lequipe')return SPORT[1];
 return null;
}
function family(publisher){return identity(publisher)?.family||String(publisher||'').trim();}
function googleFeed(name,query,allow){
 return {name,url:'https://news.google.com/rss/search?q='+encodeURIComponent(query)+'&hl=fr&gl=FR&ceid=FR%3Afr',aggregate:true,allowPublishers:allow};
}
const DISCOVERY=[
 googleFeed('Télévisions et radios · veille', '(site:bfmtv.com OR site:tf1info.fr OR site:rtl.fr) when:2d',['BFMTV','TF1 INFO','RTL','LCI']),
 googleFeed('Presse quotidienne · veille', '(site:leparisien.fr OR site:ouest-france.fr OR site:sudouest.fr OR site:lesechos.fr) when:2d',['Le Parisien','Ouest-France','Sud Ouest','Les Échos']),
 googleFeed('Presse sportive · veille', '(site:rmcsport.bfmtv.com OR site:lequipe.fr OR site:rugbyrama.fr OR site:midi-olympique.fr) when:2d',['RMC Sport',"L'Équipe",'Rugbyrama','Midi Olympique'])
];
function acceptsAggregate(feed,publisher,sourceUrl){
 if(!feed.aggregate)return true;
 const known=identity(publisher);
 if(!known||!feed.allowPublishers.includes(known.name))return false;
 return true;
}
module.exports={GENERAL,SPORT,OUTLETS,DISCOVERY,identity,family,normalize,acceptsAggregate};