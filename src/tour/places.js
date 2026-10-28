/**
 * Places for the virtual tours.
 *
 * offline.nodes are viewpoints (one 360° photo each, in public/tours/). Links say which way to walk:
 *   yaw   direction of the arrow in this photo, in degrees (0 = middle of the image, + = to the right)
 *   to    the node you arrive at
 * When you arrive you face away from the link that leads back (override with arriveYaw).
 *   fov   for a photo that is not a full 360°×180° sphere: { h, v, y? } = degrees it covers horizontally
 *         and vertically, y = how far its centre sits above the horizon. The view stays inside the photo.
 * google.heading is the starting direction when Google Street View is used instead.
 *
 * Facts are short and kid-friendly; double-check them before the booth opens.
 * All photos are from Wikimedia Commons under free licences (see credits, also shown in the info card).
 */
const COMMONS = 'https://commons.wikimedia.org/wiki/File:'

// Photo Dharma's 360° photos (LG 360 Cam) are cropped below 50° down: that removes their watermark strip
// and the photographer at the bottom. So they cover the full circle, from straight up to 50° down.
const DHARMA_FOV = { h: 360, v: 140, y: 20 }
const dharma = (list) =>
  list.map(([file, title]) => ({ file, author: 'Photo Dharma', license: 'CC BY 2.0', source: `${COMMONS}${title.replaceAll(' ', '_')}` }))

export const TOUR_PLACES = [
  {
    id: 'sanchi',
    nameAr: 'ستوبا سانشي',
    name: 'Sanchi Stupa',
    cityAr: 'ماديا براديش',
    lat: 23.4793,
    lng: 77.7398,
    pin: { dx: -53, dy: -52 }, // central India is crowded: pins sit apart, with a line to the real spot
    google: { heading: 0 },
    facts: [
      'الستوبا الكبرى من أقدم المباني الحجرية في الهند، بدأ بناءها الإمبراطور أشوكا في القرن الثالث قبل الميلاد.',
      'الستوبا قبة نصف كروية تحفظ آثارًا مقدّسة عند البوذيين، ويطوف الزوّار حولها.',
      'لها أربع بوابات منحوتة (تورانا) في الاتجاهات الأربع، تحكي قصصًا من حياة بوذا.',
      'مُدرجة في قائمة التراث العالمي لليونسكو منذ عام 1989.',
    ],
    offline: {
      start: 'south',
      nodes: [
        {
          id: 'south',
          file: 'sanchi-south-outer.jpg',
          nameAr: 'البوابة الجنوبية',
          startYaw: 175,
          fov: DHARMA_FOV,
          links: [
            { to: 'terrace', yaw: 180 },
            { to: 'distance', yaw: 0 },
            { to: 'east', yaw: -150 },
            { to: 'west', yaw: 140 },
          ],
        },
        { id: 'terrace', file: 'sanchi-south-inner.jpg', nameAr: 'ممرّ الطواف حول القبة', fov: DHARMA_FOV, links: [{ to: 'south', yaw: 175 }] },
        { id: 'distance', file: 'sanchi-distance.jpg', nameAr: 'منظر من بعيد', fov: DHARMA_FOV, links: [{ to: 'south', yaw: 175 }] },
        {
          id: 'east',
          file: 'sanchi-east-outer.jpg',
          nameAr: 'البوابة الشرقية',
          fov: DHARMA_FOV,
          links: [
            { to: 'south', yaw: 140 },
            { to: 'north', yaw: -140 },
          ],
        },
        {
          id: 'north',
          file: 'sanchi-north-outer.jpg',
          nameAr: 'البوابة الشمالية',
          fov: DHARMA_FOV,
          links: [
            { to: 'east', yaw: 130 },
            { to: 'west', yaw: -150 },
          ],
        },
        {
          id: 'west',
          file: 'sanchi-west-outer.jpg',
          nameAr: 'البوابة الغربية',
          fov: DHARMA_FOV,
          links: [
            { to: 'north', yaw: 140 },
            { to: 'south', yaw: -150 },
          ],
        },
      ],
    },
    credits: dharma([
      ['sanchi-south-outer.jpg', '101 South Gate Outer (32969881684).jpg'],
      ['sanchi-south-inner.jpg', '102 South Gate Inner (33656651232).jpg'],
      ['sanchi-distance.jpg', '101 Distance View (33885059336).jpg'],
      ['sanchi-east-outer.jpg', '102 East Gate Outer (33113521003).jpg'],
      ['sanchi-north-outer.jpg', '101 North Gate Outer (33083449404).jpg'],
      ['sanchi-west-outer.jpg', '101 West Gate Outer (33427531520).jpg'],
    ]),
  },
  {
    id: 'mumbai',
    nameAr: 'بوابة الهند',
    name: 'Gateway of India',
    cityAr: 'مومباي',
    lat: 18.922,
    lng: 72.8347,
    google: { heading: 200 },
    facts: [
      'بُنيت تخليدًا لزيارة الملك جورج الخامس عام 1911، واكتمل بناؤها عام 1924.',
      'تطلّ على بحر العرب، ومنها تنطلق القوارب إلى جزيرة إليفانتا.',
      'خلفها فندق تاج محل بالاس الشهير الذي افتُتح عام 1903.',
      'لغة مومباي الرسمية هي المراثية، وهي عاصمة المال والسينما (بوليوود) في الهند.',
    ],
    offline: {
      start: 'gateway',
      nodes: [
        {
          id: 'gateway',
          file: 'mumbai-gateway.jpg',
          nameAr: 'ساحة البوابة',
          startYaw: -160,
          links: [{ to: 'taj', yaw: -55, pitch: -8, arriveYaw: 0 }],
        },
        {
          id: 'taj',
          file: 'mumbai-taj-staircase.jpg',
          nameAr: 'الدرج الكبير في فندق تاج',
          startYaw: 0,
          links: [{ to: 'gateway', yaw: 180, arriveYaw: -160 }],
        },
      ],
    },
    credits: [
      { file: 'mumbai-gateway.jpg', author: 'Fuzheado', license: 'CC BY-SA 4.0', source: `${COMMONS}Pano-20230403-Gateway-of-India.jpg` },
      { file: 'mumbai-taj-staircase.jpg', author: 'Fuzheado', license: 'CC BY-SA 4.0', source: `${COMMONS}Pano-20230403-Taj-Mumbai-Grandstaircase.jpg` },
    ],
  },
  {
    id: 'ajanta',
    nameAr: 'كهوف أجانتا',
    name: 'Ajanta Caves',
    cityAr: 'مهاراشترا',
    lat: 20.5519,
    lng: 75.7033,
    pin: { dx: 97, dy: -18 }, // next door to Ellora
    google: { heading: 0 },
    facts: [
      'نحو 30 كهفًا بوذيًا منحوتًا في جرف على شكل حدوة حصان فوق نهر واغورا.',
      'يعود أقدمها إلى القرن الثاني قبل الميلاد، وأحدثها إلى القرن الخامس الميلادي تقريبًا.',
      'تشتهر بلوحاتها الجدارية الملوّنة، وهي من أقدم الرسوم الباقية في الهند.',
      'نسيها الناس قرونًا حتى رآها ضابط بريطاني أثناء رحلة صيد عام 1819.',
      'مُدرجة في قائمة التراث العالمي لليونسكو منذ عام 1983.',
    ],
    offline: {
      start: 'top',
      nodes: [
        { id: 'top', file: 'ajanta-top.jpg', nameAr: 'الوادي من الأعلى', startYaw: -60, fov: DHARMA_FOV, links: [{ to: 'halfway', yaw: -160, pitch: -15 }] },
        {
          id: 'halfway',
          file: 'ajanta-halfway.jpg',
          nameAr: 'في منتصف النزول',
          fov: DHARMA_FOV,
          links: [
            { to: 'top', yaw: -155 },
            { to: 'outside', yaw: 45 },
          ],
        },
        {
          id: 'outside',
          file: 'ajanta-outside.jpg',
          nameAr: 'أمام الكهفين 10 و11',
          fov: DHARMA_FOV,
          links: [
            { to: 'halfway', yaw: -45 },
            { to: 'cave16', yaw: 60 },
            { to: 'cave19', yaw: 100, arriveYaw: 0 },
          ],
        },
        { id: 'cave16', file: 'ajanta-cave16.jpg', nameAr: 'داخل الكهف 16', fov: DHARMA_FOV, links: [{ to: 'outside', yaw: 180 }] },
        {
          id: 'cave19',
          file: 'ajanta-cave19.jpg',
          nameAr: 'واجهة الكهف 19',
          fov: DHARMA_FOV,
          links: [
            { to: 'outside', yaw: -150 },
            { to: 'cave26', yaw: 140 },
          ],
        },
        { id: 'cave26', file: 'ajanta-cave26.jpg', nameAr: 'داخل الكهف 26', fov: DHARMA_FOV, links: [{ to: 'cave19', yaw: 180, arriveYaw: 0 }] },
      ],
    },
    credits: dharma([
      ['ajanta-top.jpg', '401 Viewpoint from the Top (33503620693).jpg'],
      ['ajanta-halfway.jpg', '402 Viewpoint from Halfway Up (34272761156).jpg'],
      ['ajanta-outside.jpg', '403 Outside Cave 11 (33471919434).jpg'],
      ['ajanta-cave16.jpg', '404 Cave 16 (34182561731).jpg'],
      ['ajanta-cave19.jpg', '405 Cave 19 (34272752616).jpg'],
      ['ajanta-cave26.jpg', '406 Cave 26, General View (33929269360).jpg'],
    ]),
  },
  {
    id: 'ellora',
    nameAr: 'كهوف إيلورا',
    name: 'Ellora Caves',
    cityAr: 'مهاراشترا',
    lat: 20.0258,
    lng: 75.178,
    pin: { dx: -10, dy: -50 },
    google: { heading: 0 },
    facts: [
      'في إيلورا 34 كهفًا متجاورة منحوتة في الجبل: بوذية وهندوسية وجاينية.',
      'الكهف 10 قاعة صلاة بوذية، سقفها منحوت في الصخر على شكل أضلاع خشبية.',
      'الكهف 12 من ثلاثة طوابق كاملة منحوتة في الصخر.',
      'قريبًا منها معبد كايلاسا (الكهف 16)، نُحت من صخرة واحدة من الأعلى إلى الأسفل.',
      'مُدرجة في قائمة التراث العالمي لليونسكو منذ عام 1983.',
    ],
    offline: {
      start: 'cave10',
      nodes: [
        { id: 'cave2', file: 'ellora-cave2.jpg', nameAr: 'الكهف 2', fov: DHARMA_FOV, links: [{ to: 'cave5', yaw: 0 }] },
        {
          id: 'cave5',
          file: 'ellora-cave5.jpg',
          nameAr: 'الكهف 5: القاعة الطويلة',
          fov: DHARMA_FOV,
          links: [
            { to: 'cave2', yaw: -35 },
            { to: 'cave10', yaw: 35 },
          ],
        },
        {
          id: 'cave10',
          file: 'ellora-cave10.jpg',
          nameAr: 'الكهف 10: قاعة فيشواكارما',
          startYaw: 180,
          fov: DHARMA_FOV,
          links: [
            { to: 'cave5', yaw: -30 },
            { to: 'cave11', yaw: 30 },
          ],
        },
        {
          id: 'cave11',
          file: 'ellora-cave11.jpg',
          nameAr: 'الكهف 11: الطابق الثاني',
          fov: DHARMA_FOV,
          links: [
            { to: 'cave10', yaw: -165 },
            { to: 'cave12', yaw: 160 },
          ],
        },
        { id: 'cave12', file: 'ellora-cave12.jpg', nameAr: 'الكهف 12: الطابق الثالث', fov: DHARMA_FOV, links: [{ to: 'cave11', yaw: 150 }] },
      ],
    },
    credits: dharma([
      ['ellora-cave2.jpg', '201 Cave 2 (33342310203).jpg'],
      ['ellora-cave5.jpg', '204 Cave 5 (34153521715).jpg'],
      ['ellora-cave10.jpg', '207 Chaitya Cave 10, Interior (34022770331).jpg'],
      ['ellora-cave11.jpg', '209 Cave 11, 2nd Floor (34022766501).jpg'],
      ['ellora-cave12.jpg', '211 Cave 12, 3rd Floor (34022763061).jpg'],
    ]),
  },
  {
    id: 'hyderabad',
    nameAr: 'حيدر آباد من السماء',
    name: 'Hyderabad (aerial)',
    cityAr: 'حيدر آباد',
    lat: 17.4166,
    lng: 78.3863,
    google: { heading: 0 },
    facts: [
      'صورة جوية بزاوية 360° فوق بحيرة مالكام تشيروفو غرب المدينة.',
      'يتحدث أهلها التيلوغوية والأردية، ورمزها الشهير مبنى تشارمينار (1591).',
      'تُلقّب بمدينة اللؤلؤ، وصارت اليوم من أكبر مراكز البرمجيات في الهند.',
    ],
    offline: {
      start: 'sky',
      nodes: [{ id: 'sky', file: 'hyderabad-aerial.jpg', nameAr: 'فوق البحيرة', startYaw: 0, links: [] }],
    },
    credits: [
      {
        file: 'hyderabad-aerial.jpg',
        author: 'iMahesh',
        license: 'CC BY-SA 4.0',
        source: `${COMMONS}Aerial_view_of_Hyderabad_around_Malkam_cheruvu_(360_panorama).jpg`,
      },
    ],
  },
  {
    id: 'udayagiri',
    nameAr: 'كهوف أوداياغيري',
    name: 'Udayagiri Caves',
    cityAr: 'ماديا براديش',
    lat: 23.5368,
    lng: 77.7722,
    pin: { dx: 92, dy: -36 }, // a few km from Sanchi
    google: { heading: 0 },
    facts: [
      'نحو 20 كهفًا هندوسيًا وجاينيًا من عهد أسرة غوبتا في القرن الخامس الميلادي.',
      'أشهرها نحت ضخم للإله فيشنو في هيئة الخنزير البري «فاراها» وهو يرفع الأرض وينقذها.',
      'تقع على بُعد بضعة كيلومترات فقط من ستوبا سانشي.',
    ],
    offline: {
      start: 'varaha',
      nodes: [
        { id: 'varaha', file: 'udayagiri-varaha.jpg', nameAr: 'نحت فاراها', startYaw: 170, fov: DHARMA_FOV, links: [{ to: 'reliefs', yaw: -60 }] },
        {
          id: 'reliefs',
          file: 'udayagiri-reliefs.jpg',
          nameAr: 'الكهوف المنحوتة',
          fov: DHARMA_FOV,
          links: [
            { to: 'varaha', yaw: 80 },
            { to: 'path', yaw: 0 },
          ],
        },
        {
          id: 'path',
          file: 'udayagiri-path.jpg',
          nameAr: 'الممرّ بين الصخور',
          fov: DHARMA_FOV,
          links: [
            { to: 'reliefs', yaw: 180 },
            { to: 'veena', yaw: 0 },
          ],
        },
        { id: 'veena', file: 'udayagiri-veena.jpg', nameAr: 'كهفا فينا وكومارا', fov: DHARMA_FOV, links: [{ to: 'path', yaw: -120 }] },
      ],
    },
    credits: dharma([
      ['udayagiri-varaha.jpg', '101 Vishnu as Varaha (32881313853).jpg'],
      ['udayagiri-reliefs.jpg', '102 Relief cut Caves (32881312113).jpg'],
      ['udayagiri-path.jpg', '103 Pathway between the Caves (33653726676).jpg'],
      ['udayagiri-veena.jpg', '104 Veena and Kumara Caves (33653725526).jpg'],
    ]),
  },
]

/** One line for the info card: "Photos: author (licence), …" */
export function creditLine(place) {
  const seen = new Map()
  for (const c of place.credits ?? []) seen.set(`${c.author} (${c.license})`, true)
  return `Photos: ${[...seen.keys()].join(', ')} · Wikimedia Commons`
}
