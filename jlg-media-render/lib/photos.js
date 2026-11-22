'use strict';
const E=require('./editorial');
// Each photo has been manually matched to a relevant subject and identified as archival when applicable.
const PHOTOS={
  "cop31-antalya-pas-accord-final": {
    "file": "General view of the COP31 Presidency’s Energy Ministerial Meeting.jpg",
    "author": "Necati Savas / Union européenne",
    "license": "CC BY 4.0",
    "licenseUrl": "https://creativecommons.org/licenses/by/4.0/",
    "caption": "Réunion ministérielle à la COP31, Antalya, 10 novembre 2026 · photo documentaire"
  },
  "choose-france-42-milliards-decryptage": {
    "file": "Palais de l'Elysée.jpg",
    "author": "Pierreschwartz",
    "license": "CC BY-SA 4.0",
    "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0/",
    "caption": "Palais de l’Élysée à Paris, photographie d’archive (2017)"
  },
  "souvigne-correze-barrage-riviere": {
    "file": "La Souvigne à Argentat-sur-Dordogne.jpg",
    "author": "Fandepanda",
    "license": "CC BY-SA 4.0",
    "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0/",
    "caption": "La Souvigne à Argentat-sur-Dordogne, photographie de mai 2024"
  },
  "correze-restrictions-eau-fin-novembre": {
    "file": "Logne D147 la Rivière aval.JPG",
    "author": "Père Igor",
    "license": "CC BY-SA 4.0",
    "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0/",
    "caption": "Lit de la Logne en Corrèze pendant une sécheresse, image d’archive de 2015, sans lien direct avec novembre 2026"
  },
  "oyonnax-brive-32-22-2026": {
    "file": "USO - RCT - 28-09-2013 - Stade Mathon - Johann Christiaan Van Niekerk.jpg",
    "author": "Clément Bucco-Lechat",
    "license": "CC BY-SA 3.0",
    "licenseUrl": "https://creativecommons.org/licenses/by-sa/3.0/",
    "caption": "Action de rugby à Oyonnax, photographie d’archive de 2013 (ce n’est pas le match du 20 novembre 2026)"
  },
  "euro-feminin-2026-bleues": {
    "file": "Equipe de France au TIPIFF 2015-20151129.jpg",
    "author": "Wenflou",
    "license": "CC0",
    "licenseUrl": "https://creativecommons.org/publicdomain/zero/1.0/",
    "caption": "L’équipe de France féminine en 2015 : illustration d’archive, pas l’effectif 2026"
  },
  "mondial-handball-2027-france": {
    "file": "Team France Handball 2019 Handball World Championship (47875743071).jpg",
    "author": "dronepicr",
    "license": "CC BY 2.0",
    "licenseUrl": "https://creativecommons.org/licenses/by/2.0/",
    "caption": "Équipe masculine de France au Mondial 2019 · photographie d’archive"
  }
};
const wikiFile=f=>'https://commons.wikimedia.org/wiki/File:'+encodeURIComponent(f.replace(/ /g,'_'));
const imageUrl=(f,w=900)=>'https://commons.wikimedia.org/wiki/Special:FilePath/'+encodeURIComponent(f.replace(/ /g,'_'))+'?width='+Math.max(330,Math.min(1200,w));
function picture(d,size='card'){
 const meta=PHOTOS[d.slug];if(!meta)return '';
 const cls=size==='lead'?'ed-photo ed-photo-lead':size==='article'?'ed-photo ed-photo-article':'ed-photo ed-photo-card';
 return '<figure class="'+cls+'"><img loading="'+(size==='lead'?'eager':'lazy')+'" decoding="async" src="'+E.esc(imageUrl(meta.file,size==='lead'?1100:size==='article'?1100:660))+'" alt="'+E.esc(meta.caption)+'"><figcaption>'+E.esc(meta.caption)+' · <a href="'+E.esc(wikiFile(meta.file))+'" target="_blank" rel="noopener noreferrer">'+E.esc(meta.author)+'</a> / <a href="'+E.esc(meta.licenseUrl)+'" target="_blank" rel="noopener noreferrer">'+E.esc(meta.license)+'</a> · Wikimedia Commons</figcaption></figure>';
}
module.exports={PHOTOS,picture,imageUrl,wikiFile};
