export const ATS_CITIES = [
  'Camp Verde, AZ','Clifton, AZ','Flagstaff, AZ','Grand Canyon Village, AZ','Kayenta, AZ','Kingman, AZ','Lake Havasu City, AZ','Nogales, AZ','Page, AZ','Phoenix, AZ','San Simon, AZ','Show Low, AZ','Sierra Vista, AZ','Tucson, AZ','Winslow, AZ','Yuma, AZ',
  'El Dorado, AR','Fayetteville, AR','Fort Smith, AR','Harrison, AR','Hot Springs, AR','Jonesboro, AR','Little Rock, AR','Pine Bluff, AR','Springdale, AR','Texarkana, AR',
  'Bakersfield, CA','Barstow, CA','Carlsbad, CA','El Centro, CA','Eureka, CA','Fresno, CA','Hornbrook, CA','Los Angeles, CA','Oakland, CA','Oxnard, CA','Redding, CA','Sacramento, CA','San Diego, CA','Santa Maria, CA','Santa Cruz, CA','San Francisco, CA','San Rafael, CA','Truckee, CA','Ukiah, CA',
  'Alamosa, CO','Burlington, CO','Colorado Springs, CO','Denver, CO','Durango, CO','Fort Collins, CO','Grand Junction, CO','Lamar, CO','Montrose, CO','Pueblo, CO','Rangely, CO','Steamboat Springs, CO','Sterling, CO',
  'Boise, ID',"Coeur d'Alene, ID",'Grangeville, ID','Idaho Falls, ID','Ketchum, ID','Lewiston, ID','Nampa, ID','Pocatello, ID','Salmon, ID','Sandpoint, ID','Twin Falls, ID',
  'Bloomington, IL','Champaign, IL','Chicago, IL','East St. Louis, IL','Effingham, IL','Marion, IL','Moline, IL','Peoria, IL','Quincy, IL','Rockford, IL','Springfield, IL',
  'Burlington, IA','Cedar Rapids, IA','Council Bluffs, IA','Davenport, IA','Des Moines, IA','Dubuque, IA','Fort Dodge, IA','Iowa City, IA','Mason City, IA','Ottumwa, IA','Sioux City, IA','Waterloo, IA',
  'Colby, KS','Dodge City, KS','Emporia, KS','Garden City, KS','Hays, KS','Hutchinson, KS','Junction City, KS','Kansas City, KS','Marysville, KS','Phillipsburg, KS','Pittsburg, KS','Salina, KS','Topeka, KS','Wichita, KS',
  'Alexandria, LA','Baton Rouge, LA','DeRidder, LA','Houma, LA','Lafayette, LA','Lake Charles, LA','Monroe, LA','Natchitoches, LA','New Orleans, LA','Port Fourchon, LA','Shreveport, LA',
  'Cape Girardeau, MO','Columbia, MO','Jefferson City, MO','Joplin, MO','Kansas City, MO','Kirksville, MO','Maryville, MO','Poplar Bluff, MO','Rolla, MO','Springfield, MO','St. Joseph, MO','St. Louis, MO',
  'Billings, MT','Bozeman, MT','Butte, MT','Glasgow, MT','Glendive, MT','Great Falls, MT','Havre, MT','Helena, MT','Kalispell, MT','Laurel, MT','Lewistown, MT','Miles City, MT','Missoula, MT','Sidney, MT','Thompson Falls, MT',
  'Alliance, NE','Chadron, NE','Columbus, NE','Grand Island, NE','Lincoln, NE','McCook, NE','Norfolk, NE','North Platte, NE','Omaha, NE','Scottsbluff, NE','Sidney, NE','Valentine, NE',
  'Carson City, NV','Elko, NV','Ely, NV','Jackpot, NV','Las Vegas, NV','Pioche, NV','Primm, NV','Reno, NV','Tonopah, NV','Winnemucca, NV',
  'Alamogordo, NM','Albuquerque, NM','Artesia, NM','Carlsbad, NM','Clovis, NM','Farmington, NM','Gallup, NM','Hobbs, NM','Las Cruces, NM','Raton, NM','Roswell, NM','Santa Fe, NM','Socorro, NM','Tucumcari, NM',
  'Ardmore, OK','Clinton, OK','Enid, OK','Guymon, OK','Idabel, OK','Lawton, OK','McAlester, OK','Oklahoma City, OK','Tulsa, OK','Woodward, OK',
  'Astoria, OR','Bend, OR','Burns, OR','Coos Bay, OR','Eugene, OR','Klamath Falls, OR','Lakeview, OR','Medford, OR','Newport, OR','Ontario, OR','Pendleton, OR','Portland, OR','Salem, OR','The Dalles, OR',
  'Abilene, TX','Amarillo, TX','Austin, TX','Beaumont, TX','Brownsville, TX','Corpus Christi, TX','Dalhart, TX','Dallas, TX','Del Rio, TX','El Paso, TX','Fort Stockton, TX','Fort Worth, TX','Galveston, TX','Houston, TX','Huntsville, TX','Laredo, TX','Longview, TX','Lubbock, TX','Lufkin, TX','McAllen, TX','Odessa, TX','San Angelo, TX','San Antonio, TX','Texarkana, TX','Tyler, TX','Van Horn, TX','Victoria, TX','Waco, TX','Wichita Falls, TX',
  'Cedar City, UT','Logan, UT','Moab, UT','Ogden, UT','Price, UT','Provo, UT','Salina, UT','Salt Lake City, UT','St. George, UT','Vernal, UT',
  'Aberdeen, WA','Bellingham, WA','Colville, WA','Everett, WA','Grand Coulee, WA','Kennewick, WA','Longview, WA','Olympia, WA','Omak, WA','Port Angeles, WA','Seattle, WA','Spokane, WA','Tacoma, WA','Vancouver, WA','Wenatchee, WA','Yakima, WA',
  'Casper, WY','Cheyenne, WY','Cody, WY','Evanston, WY','Gillette, WY','Jackson, WY','Laramie, WY','Rawlins, WY','Riverton, WY','Rock Springs, WY','Sheridan, WY'
]

export function normalizeCitySearch(value) {
  return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim()
}
