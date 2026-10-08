/* constants.js — 枚举与常量（对应小程序 utils/constants.js） */
window.LF = window.LF || {};

LF.constants = {
  ITEM_TYPE: {
    LOST: 'lost',
    FOUND: 'found'
  },

  ITEM_STATUS: {
    SEARCHING: 'searching',
    RECOVERED: 'recovered',
    PENDING_CLAIM: 'pending_claim',
    RETURNED: 'returned'
  },

  CATEGORY: [
    { code: 'id_card', name: '证件卡片' },
    { code: 'key_access', name: '钥匙门禁' },
    { code: 'digital', name: '数码电子' },
    { code: 'cup_bottle', name: '杯具水壶' },
    { code: 'book_stationery', name: '书籍文具' },
    { code: 'clothing_bag', name: '服饰箱包' }
  ]
};
