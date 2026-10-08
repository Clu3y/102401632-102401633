/* data/seed.js — 内置演示数据（种子数据）
 * 说明：原后端由 MySQL 持久化，本项目改为浏览器 localStorage。
 * 首次打开时由 db.js 把本文件的种子数据写入本地，之后所有发布 / 状态变更 /
 * 资料修改都在浏览器本地完成，刷新不丢失；清空浏览器数据会恢复为这些演示数据。
 *
 * 时间不写死：统一用“距当前多少分钟”的偏移表示，db.js 初始化时换算成真实时间，
 * 这样首页“刚刚 / x 分钟前 / x 天前”的相对时间在任何时候打开都自然。
 */
window.LF = window.LF || {};

(function (LF) {
  // 演示用户：demo 即首次匿名静默登录后绑定的“当前账号”，
  // 这样进入“我的发布”能直接看到统计与记录，便于演示。
  var USERS = [
    { key: 'demo', nickname: '林同学', avatarUrl: null, college: '计算机学院', grade: '2024' },
    { key: 'u2', nickname: '陈同学', avatarUrl: null, college: '外国语学院', grade: '2023' },
    { key: 'u3', nickname: '王同学', avatarUrl: null, college: '机械与电气工程学院', grade: '2022' },
    { key: 'u4', nickname: '赵同学', avatarUrl: null, college: '经济管理学院', grade: '2025' }
  ];

  // 物品原始数据。images 留空数组表示无图（列表显示占位图标）。
  // publishedAgoMin：发布于多少分钟前；occurredExtraMin：发生时间比发布时间再早多少分钟。
  var ITEMS = [
    {
      publisher: 'demo', type: 'lost', status: 'searching', categoryCode: 'id_card',
      name: '校园卡（姓名首字为“林”）', location: '图书馆 · 二楼自习区 A-12 座位附近',
      publishedAgoMin: 9 * 1440 + 360, occurredExtraMin: 130, viewCount: 3,
      description: '白色卡面校园卡，外面套有透明卡套，卡套背面贴有浅蓝色便利贴。',
      message: '这张卡对我很重要，如果您捡到，麻烦联系我核对一下特征。',
      images: ['assets/items/id_card.svg'], contact: 'lin_2024_card', meetingPlace: '图书馆一楼服务台'
    },
    {
      publisher: 'u2', type: 'found', status: 'pending_claim', categoryCode: 'digital',
      name: '黑色无线耳机（充电盒有贴纸）', location: '第二食堂 · 一楼靠窗餐桌',
      publishedAgoMin: 8 * 1440 + 120, occurredExtraMin: 70, viewCount: 12,
      description: '黑色真无线耳机一副，充电盒盖子上贴了一张宇航员贴纸，右耳有点使用痕迹。',
      message: '请失主描述耳机品牌和贴纸细节，核对后归还。',
      images: ['assets/items/digital.svg'], contact: '13800001111', meetingPlace: '第二食堂一楼服务台'
    },
    {
      publisher: 'u3', type: 'lost', status: 'searching', categoryCode: 'cup_bottle',
      name: '蓝色保温杯（贴纸款）', location: '第二食堂 · 二楼餐具回收处附近',
      publishedAgoMin: 7 * 1440, occurredExtraMin: 95, viewCount: 5,
      description: '500ml 蓝色保温杯，杯身贴了演唱会周边贴纸，杯底有一道小磕痕。',
      message: null,
      images: ['assets/items/cup_bottle.svg'], contact: 'w_cup_2022', meetingPlace: null
    },
    {
      publisher: 'u4', type: 'found', status: 'returned', categoryCode: 'key_access',
      name: '一串钥匙（带小熊挂件）', location: '体育馆 · 羽毛球馆 3 号场地看台',
      publishedAgoMin: 6 * 1440 + 300, occurredExtraMin: 60, viewCount: 8,
      description: '三把钥匙串在一起，挂着一个棕色小熊毛绒挂件和一枚蓝色门禁扣。',
      message: null,
      images: ['assets/items/key_access.svg'], contact: '13900002222', meetingPlace: '体育馆前台'
    },
    {
      publisher: 'demo', type: 'found', status: 'pending_claim', categoryCode: 'book_stationery',
      name: '高等数学教材（书内有笔记）', location: '第一教学楼 · 302 教室倒数第二排',
      publishedAgoMin: 5 * 1440, occurredExtraMin: 150, viewCount: 6,
      description: '同济版《高等数学（上册）》，前 40 页有荧光笔划线和手写笔记，书角微卷。',
      message: '已交到教学楼值班室，也可以约时间当面给你。',
      images: ['assets/items/book_stationery.svg'], contact: 'lin_book_note', meetingPlace: '第一教学楼值班室'
    },
    {
      publisher: 'u2', type: 'lost', status: 'recovered', categoryCode: 'digital',
      name: '银色 U 盘（32G）', location: '外语楼 · 二楼语音实验室',
      publishedAgoMin: 4 * 1440 + 200, occurredExtraMin: 110, viewCount: 4,
      description: '银色金属外壳 32G U 盘，挂绳孔系着一根红绳，里面有课程作业备份。',
      message: null,
      images: [], contact: 'chen_usb_2023', meetingPlace: null
    },
    {
      publisher: 'u3', type: 'found', status: 'pending_claim', categoryCode: 'clothing_bag',
      name: '黑色双肩背包', location: '图书馆 · 三楼存包柜旁长椅',
      publishedAgoMin: 3 * 1440 + 400, occurredExtraMin: 80, viewCount: 15,
      description: '黑色双肩背包，前袋有一枚校徽徽章，包内有几本专业课本和一个水杯。',
      message: '为安全起见，包内物品请失主当面清点核对。',
      images: ['assets/items/clothing_bag.svg'], contact: '13700003333', meetingPlace: '图书馆三楼服务台'
    },
    {
      publisher: 'demo', type: 'lost', status: 'recovered', categoryCode: 'id_card',
      name: '学生证（计算机学院）', location: '学生活动中心 · 一楼报告厅',
      publishedAgoMin: 2 * 1440 + 90, occurredExtraMin: 200, viewCount: 2,
      description: '计算机学院学生证，卡套是磨砂黑色，内夹一张食堂饭卡。',
      message: null,
      images: [], contact: 'lin_student_id', meetingPlace: null
    },
    {
      publisher: 'u4', type: 'lost', status: 'searching', categoryCode: 'key_access',
      name: '宿舍门禁卡套（蓝色）', location: '南区宿舍 · 6 号楼楼下快递柜附近',
      publishedAgoMin: 2 * 1440, occurredExtraMin: 75, viewCount: 7,
      description: '蓝色硅胶卡套，里面是 6 号楼门禁卡，卡套上挂着小铃铛。',
      message: '晚归进不了门，捡到请尽快联系我，非常感谢！',
      images: [], contact: 'zhao_door_2025', meetingPlace: '南区 6 号楼门口'
    },
    {
      publisher: 'u2', type: 'found', status: 'pending_claim', categoryCode: 'cup_bottle',
      name: '透明水杯（贴有星黛露贴纸）', location: '田径场 · 看台西侧第 5 排',
      publishedAgoMin: 1440 + 360, occurredExtraMin: 65, viewCount: 9,
      description: '透明塑料水杯，杯身贴星黛露贴纸，杯带是粉色的。',
      message: null,
      images: [], contact: '13600004444', meetingPlace: '田径场器材室'
    },
    {
      publisher: 'demo', type: 'found', status: 'returned', categoryCode: 'book_stationery',
      name: '一支黑色签字笔', location: '图书馆 · 一楼大厅检索机旁',
      publishedAgoMin: 1440 + 120, occurredExtraMin: 40, viewCount: 1,
      description: '普通黑色按动签字笔，笔夹处有轻微咬痕。',
      message: null,
      images: [], contact: 'lin_pen_2024', meetingPlace: null
    },
    {
      publisher: 'u3', type: 'lost', status: 'searching', categoryCode: 'digital',
      name: '白色充电宝（罗马仕）', location: '第三教学楼 · 205 教室讲台附近',
      publishedAgoMin: 20 * 60, occurredExtraMin: 120, viewCount: 0,
      description: '罗马仕白色 10000mAh 充电宝，一面贴了机甲贴纸，USB 口旁有划痕。',
      message: '明天上课还要用，麻烦捡到的同学联系我，请你喝奶茶。',
      images: ['assets/items/digital.svg'], contact: 'wang_power_2022', meetingPlace: '第三教学楼大厅'
    },
    {
      publisher: 'u4', type: 'found', status: 'pending_claim', categoryCode: 'id_card',
      name: '银行卡（建行，尾号已隐去）', location: '校园卡务中心 · 门口 ATM 机',
      publishedAgoMin: 6 * 60, occurredExtraMin: 45, viewCount: 0,
      description: '一张建设银行卡，已暂存卡务中心，出于安全不在此公布完整卡号。',
      message: '请失主带身份证到卡务中心认领。',
      images: [], contact: '13500005555', meetingPlace: '校园卡务中心'
    },
    {
      publisher: 'demo', type: 'lost', status: 'searching', categoryCode: 'clothing_bag',
      name: '雨伞（藏青色长柄）', location: '图书馆 · 二楼存包架',
      publishedAgoMin: 25, occurredExtraMin: 100, viewCount: 0,
      description: '藏青色 24 骨长柄雨伞，伞柄是弯勾木柄，伞套上绣了一个“林”字。',
      message: '今天可能下雨，急用，万分感谢！',
      images: ['assets/items/clothing_bag.svg'], contact: 'lin_umbrella_2024', meetingPlace: '图书馆二楼服务台'
    }
  ];

  LF.seed = { USERS: USERS, ITEMS: ITEMS };
})(window.LF);
