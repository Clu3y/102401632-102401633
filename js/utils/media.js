/* 仅在读取时解析演示素材；不迁移、不写入 localStorage。 */
window.LF = window.LF || {};
(function (LF) {
  var DEMO_FILES = [
    'illustrations/campus-card.svg', 'photos/earbuds.webp', 'illustrations/blue-flask.svg',
    'photos/keys.webp', 'photos/study-book.webp', 'photos/usb.webp', 'photos/backpack.webp',
    'illustrations/student-card.svg', 'illustrations/access-card.svg', 'photos/clear-bottle.webp',
    'photos/pen.webp', 'photos/white-powerbank.webp', 'illustrations/bank-card.svg',
    'illustrations/navy-umbrella.svg'
  ];
  var CATEGORY_ICONS = { id_card: 'id-card', key_access: 'key-round', digital: 'headphones',
    cup_bottle: 'bottle-wine', book_stationery: 'book-open', clothing_bag: 'backpack' };

  function fallback(category) {
    return Object.prototype.hasOwnProperty.call(CATEGORY_ICONS, category)
      ? 'assets/items/' + category + '.svg' : '';
  }
  function categoryIcon(category) { return CATEGORY_ICONS[category] || 'package'; }

  function resolve(item) {
    var images = (item.images || []).slice();
    var index = Number(item.id) - 1;
    var seed = LF.seed.ITEMS[index];
    // ID、名称、类别、类型和完整旧图片列表必须同时匹配；新增同名帖不会命中。
    var demo = seed && Number.isInteger(index) && item.name === seed.name &&
      item.categoryCode === seed.categoryCode && item.type === seed.type &&
      JSON.stringify(images) === JSON.stringify(seed.images || []);
    if (demo) images = ['assets/items/' + DEMO_FILES[index]];
    return { images: images, coverImageUrl: images[0] || null,
      mediaKind: demo ? 'demo' : (images.length ? 'upload' : 'placeholder') };
  }
  LF.media = { resolve: resolve, fallback: fallback, categoryIcon: categoryIcon };
})(window.LF);
