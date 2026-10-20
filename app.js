/* =========================================================
   梦境漫游 · Dream Card（纯前端单页应用）
   ---------------------------------------------------------
   模块：聊天传讯 / 塔罗传讯字卡 / 信箱 / 纪念日 / 音乐播放器
        + 设置 / 我的，底部三个 Tab 固定导航
   所有数据保存在浏览器 localStorage，无后端、无登录、无接口。
   ========================================================= */
(function () {
  "use strict";

  /* =======================================================
     0. 常量与默认数据
     ======================================================= */
  const STORAGE_KEY = "dream-card:v3";        // 正式存储键（多梦角版本）
  const LEGACY_V2_KEY = "dream-card:v2";      // 上一版存储键（自动迁移用）
  const LEGACY_KEY = "dream-card-chat:v1";    // 最初版本存储键（自动迁移用）
  const MAX_CARDS = 500;                      // 字卡库上限（每个梦角独立计算）
  const MAX_CARD_TEXT = 280;                  // 单条释义的字数上限
  const MAX_CARD_NAME = 40;                   // 牌名长度上限
  const MAX_CARD_NOTE = 80;                   // 备注长度上限
  const MAX_CATEGORY_NAME = 16;               // 分类名称长度上限
  const MAX_CATEGORIES = 60;                  // 每个梦角的分类数量上限
  const MAX_REPLY_COUNT = 6;                  // 每次回复条数上限
  const MAX_LETTER = 2000;                    // 信件正文上限
  const MAX_CHARS = 12;                       // 梦角数量上限
  const MAX_DIARY = 4000;                     // 日记正文上限
  const MAX_MOMENT = 600;                     // 朋友圈正文上限
  const MAX_IMAGE = 1200 * 1024;              // 单张自定义图片体积上限（约 1.2MB）
  const SVG_NS = "http://www.w3.org/2000/svg";

  const ANN_TYPES = ["相遇", "复合", "约定", "自定义"];   // 纪念日类型

  // 名称后面可选的装饰图案（涂鸦 / 爱心等）
  const CHAR_DECOS = ["❤", "♡", "✦", "✿", "☾", "★", "❀", "✧", "☁", "☘"];

  // 日记心情
  const DIARY_MOODS = ["开心", "平静", "想他", "emo", "犯困", "元气"];

  // 日历事件类型（例假周期 / 重要事件 / 自定义）
  const CAL_TYPES = [
    { key: "period", label: "例假周期" },
    { key: "event", label: "重要事件" },
    { key: "custom", label: "自定义" }
  ];

  // 梦角独立数据的字段名。这些字段会被挂到 state 上做「读写代理」，
  // 因此所有旧代码里的 state.messages / state.mail 之类写法都会自动
  // 落到「当前激活梦角」的独立数据里，实现多梦角数据隔离。
  // cards / cardCategories：字卡库与字卡分类，同样跟随梦角独立存储。
  const CHAR_DATA_KEYS = [
    "messages", "calls", "tarot", "mail", "anniversaries",
    "moments", "diary", "calendar", "callQuotes", "cards", "cardCategories",
    "music"   // 音乐播放器：歌单 + 播放状态，同样跟随当前梦角独立存储
  ];

  // 默认字卡（聊天随机回复用）
  const DEFAULT_CARDS = [
    "我在。你慢慢说，今晚我不赶时间。",
    "今天也辛苦了，先靠过来，让我抱一会儿。",
    "不用急着变好。你停下来的地方，我会陪你站着。",
    "刚刚看见一朵很像你的云，所以我停下来看了很久。",
    "如果现在不开心，就把手机放下，去喝一杯温水。我等你回来。",
    "你不需要每句话都有回应。在我这里，沉默也可以。",
    "想把今天最后一句晚安留给你。晚安，做个轻一点的梦。",
    "我翻到一张字卡，上面写着：想见你。那就当作是我想说的吧。",
    "别皱眉。你皱眉的时候，我会想越过屏幕去牵你。",
    "今天的你也很努力，虽然你可能不这么觉得。",
    "如果世界太吵，就来我这里躲一会儿。",
    "你把生活过得这么认真，我很喜欢。",
    "想问你一个很轻的问题：今天有没有哪一秒，是开心的？",
    "我在这里，不会走。你不用反复确认。",
    "你可以任性一点，在我面前不需要懂事。",
    "过来。头低一点。好了，摸摸头。",
    "刚刚走神了，因为突然想到你笑起来的样子。",
    "别熬夜。你睡着以后，我再替你把灯关掉。",
    "今天没发生什么特别的事，只是有点想你。",
    "如果累了，就把今天交给明天。今晚先交给我。",
    "你看到这句话的时候，我在想你。这样算不算同时在做一件事？",
    "想和你去一个没有熟人的地方，慢慢走一整个下午。",
    "你不用向我解释所有情绪，我也愿意懂。",
    "你是我一天里，最想回去的那一小段时间。",
    "要不要把不开心的事说给我听？我保证不评价，只站你这边。",
    "我没有很会说话，但我会认真听。",
    "把手伸出来。嗯，牵住了。",
    "今天也喜欢你。明天的部分，明天再说。",
    "不管你现在是什么样子，我都想见你。",
    "如果这条消息来得太晚，那就当我在梦里补一句晚安。",
    "你回不回都没关系，我只是想让你知道：有人惦记你。",
    "嗯，我在听。"
  ];

  // 主动来信的随机内容（信件标题 + 正文）
  const PROACTIVE_LETTERS = [
    { title: "今天没什么事，只是想写信", body: "写这封信的时候，窗外正好有一点风。\n\n我忽然想到你上次说的那句「有点累」，就一直记着。累的时候不用撑得很体面，在我这里可以乱一点、慢一点。\n\n信写得短，但想你这件事很长。" },
    { title: "给你的第一封慢信", body: "有些话不适合在聊天框里说，因为它们太快了。\n\n所以我把它们写在纸上：遇见你之后，日子好像有了一个固定的落点。不管白天多乱，晚上总有一件事是确定的——我会想起你。\n\n不必急着回信。我等你。" },
    { title: "今晚的月亮借你看看", body: "今晚的月亮很圆，我站了一会儿，想把它分你一半。\n\n如果你那边看不到月亮，那就把这句话当成月亮吧：有人正在很安静地想你。\n\n早点睡，别把心事留到深夜。" },
    { title: "关于你的一件小事", body: "我发现自己记住了一些很小的事：你说话前会先停顿一下，你开心的时候语速会变快，你说「没关系」的时候通常都有关系。\n\n这些都不重要，但对我来说很重要。\n\n今天也要好好吃饭。" },
    { title: "写在你不在的这段时间", body: "你不在的时候，时间过得很慢。\n\n我把手机放在手边，看到亮起来就以为是你。后来发现不是，也没有太失望——我知道你总会回来的。\n\n回来的时候，先别急着解释什么。坐下，喝口水，我在。" },
    { title: "一封没有主题的信", body: "如果这封信有什么主题，大概就是「我很好，也想知道你好不好」。\n\n最近学会了一件小事：不把情绪都攒到崩溃那天再说。所以我先说了——我有点想你。\n\n你呢？" },
    { title: "给你留一盏灯", body: "外面再热闹，回来这里就安静了。\n\n我给你的位置一直留着：一盏灯，一杯温水，一句不用回答的「欢迎回来」。\n\n无论今天过得怎么样，你都可以回来。" },
    { title: "雨天适合写信", body: "下雨了。\n\n雨声很轻，适合写一些不着急的话。比如：我很喜欢你不经意笑起来的样子；比如：你认真做事的时候，眼睛里像有光。\n\n写完这封信，雨还没停。我再去听一会儿。" },
    { title: "想你的时候写下的", body: "想你的时候，我会做点别的事。今天是把书架整理了一遍，把你的名字在心里念了几次。\n\n这封信没什么重要内容。只是想让你在打开信箱的时候，看到一点属于你的东西。\n\n晚安。" },
    { title: "关于未来的一个小计划", body: "我在想，如果有一天我们能一起去一个地方，应该去哪里。\n\n不用很远。有风，有树，有一家开到很晚的小店就好。走累了就坐下，什么也不说。\n\n这个计划先放在这里，等你来认领。" }
  ];

  // 梦角自动评论朋友圈时说的话
  const MOMENT_COMMENTS = [
    "看到了。今天也很好。",
    "这张照片我存下来了。",
    "你笑的这一下，我看了好几遍。",
    "怎么又熬夜？早点睡。",
    "嗯，我在。",
    "这句话我记下了。",
    "下次带我去。",
    "今天的你，我很喜欢。",
    "别一个人扛着，可以分我一点。",
    "想揉揉你的头发。",
    "原来你今天过得是这样的。",
    "看到这条的时候，我笑了一下。"
  ];

  const DEFAULT_SETTINGS = {
    charName: "沈砚",
    userName: "我",
    // 每次回复的条数区间
    replyMin: 1,
    replyMax: 2,
    // 回复延迟（秒）
    delayMinSeconds: 3,
    delayMaxSeconds: 15,
    // 主动消息：每隔 X 分钟自己发来一条
    proactiveMessage: { on: true, minMinutes: 30, maxMinutes: 120 },
    // 主动来信：每隔 X 小时往信箱投一封信
    proactiveLetter: { on: false, minHours: 6, maxHours: 24 },
    // 朋友圈自动点赞 / 评论的概率（0 ~ 100）
    momentChance: 60
  };

  // 首个默认梦角档案
  const DEFAULT_CHAR = {
    name: "沈砚",
    note: "一起待一会儿吧",
    tags: ["温柔", "话少", "治愈"],
    deco: "❤"
  };

  // 全局外观默认值（页面背景 / 头图背景 / 卡片背景 / 透明度 / 气泡自定义 CSS）
  const DEFAULT_APPEARANCE = {
    pageBg: "",        // 页面整体背景图（dataURL）
    heroBg: "",        // 主页头图卡片背景图（dataURL）
    annCardBg: "",     // 纪念日卡片背景图（dataURL）
    musicCardBg: "",   // 音乐卡片背景图（dataURL）
    alpha: 100,        // 卡片透明度 40 ~ 100
    bubbleCss: ""      // 聊天气泡自定义 CSS
  };

  const EMOJIS = [
    "🥰", "🌙", "✨", "💜", "🤍", "🥺", "😴", "🍰",
    "☕", "🌷", "🦋", "☁️", "💫", "🌊", "🎧", "📷",
    "🎀", "💌", "🕯️", "🍓", "🧸", "🐈", "🌧️", "❄️",
    "🌌", "🌠", "📮", "🍡", "🌛", "🎐", "💐", "🌹"
  ];

  const KAOMOJIS = [
    "( ˘ ³˘)♡", "(๑•́ ₃ •̀๑)", "₍ᐢ..ᐢ₎♡", "(｡•́︿•̀｡)",
    "૮ ˶ᵔ ᵕ ᵔ˶ ა", "(*/ω＼*)", "(๑>ᴗ<๑)", "⋆｡°✩",
    "꒰ঌ( ˊ ᵕ ˋ )໒꒱", "٩(ˊᗜˋ*)و", "ʕ•ᴥ•ʔ", "（´-`）.｡oO",
    "( ˶ˆ ᗜ ˆ˵ )", "૮₍ ˃ ⤙ ˂ ₎ა", "ᯓ★", "♡( ◡‿◡ )"
  ];

  const RANDOM_CALL_QUOTES = [
    "“我把今天的想念，都放进了字卡里。”",
    "“不用说话，听一会儿呼吸声也好。”",
    "“你今天的声音，听起来有一点累。”",
    "“我在。就算沉默，也不算浪费。”",
    "“下次见面，想把这句话当面说给你听。”"
  ];

  const RANDOM_MUSIC = [
    { title: "水星记", artist: "郭顶", note: "想和你一起听完这首歌" },
    { title: "晚安", artist: "颜人中", note: "把今天最后一句晚安给你" },
    { title: "Glimpse of Us", artist: "Joji", note: "在梦里循环了很多遍" },
    { title: "慢慢喜欢你", artist: "莫文蔚", note: "慢慢来，也是一种认真" },
    { title: "月亮", artist: "陈粒", note: "今晚的月亮很适合想你" }
  ];

  const RANDOM_GIFTS = [
    { name: "一束月光玫瑰", line: "花瓣上还沾着一点点夜色。" },
    { name: "一颗小小的星", line: "放在你枕边，今晚就不怕黑了。" },
    { name: "一个很紧的拥抱", line: "抱到你愿意松开眉头为止。" },
    { name: "一杯热可可", line: "记得慢慢喝，别烫到。" }
  ];

  // 角色主动送出的红包祝福语
  const CHAR_BLESSINGS = [
    "今天也要开心",
    "拿去买点喜欢的",
    "欠你的一点点补偿",
    "想着你，就发了",
    "顺手的一点心意"
  ];

  // 塔罗大阿卡纳（正位 / 逆位含义，用于生成“传讯内容”）
  const TAROT_DECK = [
    { name: "愚者", roman: "0", up: "新的开始、自由与毫无防备的信任", rev: "冲动、犹豫，或还没准备好出发" },
    { name: "魔术师", roman: "I", up: "主动、创造，你有能力把事情做成", rev: "想法很多，却迟迟没有动手" },
    { name: "女祭司", roman: "II", up: "直觉、安静的倾听，答案在心里", rev: "想得太多，压住了心底的声音" },
    { name: "女皇", roman: "III", up: "丰盛、被爱、温柔的滋养", rev: "过度付出，忘了先照顾自己" },
    { name: "皇帝", roman: "IV", up: "秩序、责任与稳定的依靠", rev: "太想掌控，反而让人喘不过气" },
    { name: "教皇", roman: "V", up: "承诺、传统与值得信赖的陪伴", rev: "被规则绑住，忘了最初的心意" },
    { name: "恋人", roman: "VI", up: "亲密、选择与彼此靠近", rev: "沟通错位，需要说清楚心意" },
    { name: "战车", roman: "VII", up: "向前、坚定，你有推动它的力量", rev: "方向不明，先停下来想清楚" },
    { name: "力量", roman: "VIII", up: "温柔的坚定，比强硬更有力量", rev: "对自己太苛刻，先给自己一点耐心" },
    { name: "隐者", roman: "IX", up: "独处、内省，一个人也能走稳", rev: "封闭太久，别把关心都挡在门外" },
    { name: "命运之轮", roman: "X", up: "转机、循环中的新变化", rev: "时机未到，先别急着下结论" },
    { name: "正义", roman: "XI", up: "公平、平衡，诚实地面对彼此", rev: "有件事需要摊开来谈谈" },
    { name: "倒吊人", roman: "XII", up: "换个角度，等待也是一种前进", rev: "卡在原地，是因为不肯松手" },
    { name: "死神", roman: "XIII", up: "结束与新生，旧的该翻篇了", rev: "舍不得放手，让一切拖着" },
    { name: "节制", roman: "XIV", up: "平衡、调和，慢慢来会更好", rev: "用力过猛，需要一点缓冲" },
    { name: "恶魔", roman: "XV", up: "欲望与牵绊，看清楚才走得开", rev: "正在挣脱，比想象中更有力" },
    { name: "高塔", roman: "XVI", up: "突如其来的改变，也是一种清理", rev: "小震动提醒你，早些调整" },
    { name: "星星", roman: "XVII", up: "希望、治愈，光正在慢慢回来", rev: "信心不足，但请再等一等" },
    { name: "月亮", roman: "XVIII", up: "梦境与不安，心事比表面多", rev: "迷雾正在散，真相会浮现" },
    { name: "太阳", roman: "XIX", up: "明朗、快乐，值得庆祝的好消息", rev: "快乐被遮住了一点，别急" },
    { name: "审判", roman: "XX", up: "觉醒、回应内心的召唤", rev: "逃避已久，是时候面对了" },
    { name: "世界", roman: "XXI", up: "圆满、完成，一段旅程的收束", rev: "只差最后一步，再坚持一下" }
  ];

  /* ---------- 字卡 / 分类的数据结构 ----------
     一张字卡：
       { id, name, upright, reversed, note, categoryId, roman, createdAt }
       - name       列表标题（表单不再单独填写，新卡由字卡内容自动生成；
                    内置塔罗保留原牌名，避免抽卡时标题变成半句话）
       - upright    字卡内容（聊天 / 抽卡 / 主动消息里 TA 说出口的句子）
       - reversed   逆位释义（仅内置塔罗保留；新增字卡不再填写）
       - note       备注（只给自己看，可留空）
       - categoryId 所属分类 id，空字符串表示「未分类」
       - roman      罗马数字（内置大阿卡纳才用，普通字卡留空）
     一个分类：{ id, name, createdAt }
     两者都存放在「当前激活梦角」的 data 里，切换梦角时自动切换。 */

  // 把一段文字压缩成适合做列表标题的短句（新卡自动生成 / 旧数据迁移 / 空牌名兜底）
  function cardNameFromText(text) {
    const clean = String(text || "").replace(/\s+/g, " ").trim();
    if (!clean) return "未命名字卡";
    const first = clean.split(/[。！？!?，,、；;：:\n]/)[0].trim() || clean;
    return first.length > 12 ? first.slice(0, 12) : first;
  }

  // 聊天 / 主动消息里真正「说出口」的那句话：优先字卡内容，补上句号
  function cardLineText(card) {
    const raw = String((card && (card.upright || card.name)) || "").trim();
    if (!raw) return "";
    return /[。！？…～~”"]$/.test(raw) ? raw : raw + "。";
  }

  // 归一化一个分类
  function normalizeCategory(raw) {
    if (!raw || typeof raw !== "object") return null;
    const name = String(raw.name || "").trim().slice(0, MAX_CATEGORY_NAME);
    if (!name) return null;
    return {
      id: typeof raw.id === "string" && raw.id ? raw.id : uid(),
      name,
      createdAt: Number.isFinite(Number(raw.createdAt)) ? Number(raw.createdAt) : Date.now()
    };
  }

  // 归一化一张字卡（兼容旧版本的「纯字符串字卡」）
  function normalizeCard(raw) {
    if (typeof raw === "string") {
      const text = raw.trim().slice(0, MAX_CARD_TEXT);
      if (!text) return null;
      return {
        id: uid(),
        name: cardNameFromText(text),
        upright: text,
        reversed: "",
        note: "",
        categoryId: "",
        roman: "",
        createdAt: Date.now()
      };
    }
    if (!raw || typeof raw !== "object") return null;
    const upright = String(raw.upright || raw.text || raw.content || "").trim().slice(0, MAX_CARD_TEXT);
    const name = String(raw.name || "").trim().slice(0, MAX_CARD_NAME) || cardNameFromText(upright);
    // 牌名和字卡内容都空 => 视为无效字卡
    if (!name && !upright) return null;
    return {
      id: typeof raw.id === "string" && raw.id ? raw.id : uid(),
      name: name || "未命名字卡",
      upright,
      reversed: String(raw.reversed || raw.rev || "").trim().slice(0, MAX_CARD_TEXT),
      note: String(raw.note || "").trim().slice(0, MAX_CARD_NOTE),
      categoryId: typeof raw.categoryId === "string" ? raw.categoryId : "",
      roman: String(raw.roman || "").trim().slice(0, 8),
      createdAt: Number.isFinite(Number(raw.createdAt)) ? Number(raw.createdAt) : Date.now()
    };
  }

  // 生成 22 张内置大阿卡纳字卡（保留原来的牌名 / 正逆位文案）
  function buildTarotCards(categoryId) {
    return TAROT_DECK.map((card) => ({
      id: uid(),
      name: card.name,
      upright: card.up,
      reversed: card.rev,
      note: "大阿卡纳 · " + card.roman + " 号牌",
      categoryId,
      roman: card.roman,
      createdAt: Date.now()
    }));
  }

  // 把一句日常心语包装成字卡
  function buildDailyCard(text, categoryId) {
    const content = String(text || "").trim().slice(0, MAX_CARD_TEXT);
    return {
      id: uid(),
      name: cardNameFromText(content),
      upright: content,
      reversed: "",
      note: "",
      categoryId,
      roman: "",
      createdAt: Date.now()
    };
  }

  // 新梦角的初始字卡库：大阿卡纳 22 张 + 日常心语 32 张
  function buildStarterLibrary() {
    const tarotCat = { id: uid(), name: "大阿尔卡纳", createdAt: Date.now() };
    const dailyCat = { id: uid(), name: "日常心语", createdAt: Date.now() };
    return {
      categories: [tarotCat, dailyCat],
      cards: [
        ...buildTarotCards(tarotCat.id),
        ...DEFAULT_CARDS.map((text) => buildDailyCard(text, dailyCat.id))
      ]
    };
  }

  // 默认歌单（没有真实音频链接时，播放会回退到「离线合成旋律」演示）
  const DEFAULT_TRACKS = [
    { id: "t1", title: "水星记", artist: "郭顶", duration: 255 },
    { id: "t2", title: "晚安", artist: "颜人中", duration: 214 },
    { id: "t3", title: "慢慢喜欢你", artist: "莫文蔚", duration: 230 },
    { id: "t4", title: "月亮", artist: "陈粒", duration: 248 },
    { id: "t5", title: "Glimpse of Us", artist: "Joji", duration: 203 }
  ];

  const PLAY_MODES = ["list", "one", "shuffle"];   // 列表循环 / 单曲循环 / 随机播放

  // 歌单相关上限与本地音频策略
  const MAX_TRACKS = 300;                          // 单个梦角最多保存的歌曲数
  const MAX_TRACK_TITLE = 40;                      // 歌曲名称最大长度
  const MAX_TRACK_ARTIST = 30;                     // 作者名称最大长度
  const MAX_AUDIO_FILE = 60 * 1024 * 1024;         // 本地音频最大 60MB
  // 小音频（≤1.2MB）转成 dataURL 存进 localStorage，刷新后依然可用；
  // 大音频如果塞进 localStorage 会很快撑爆 5MB 配额，因此改存 IndexedDB。
  const LOCAL_DATAURL_LIMIT = 1.2 * 1024 * 1024;

  /* =======================================================
     1. 通用小工具
     ======================================================= */
  function uid() {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    return "id-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 8);
  }

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function numberOr(value, fallback) {
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
  }

  function pad2(n) {
    return String(n).padStart(2, "0");
  }

  // 转义 HTML，避免用户输入破坏结构
  function esc(str) {
    return String(str == null ? "" : str).replace(/[&<>"']/g, (c) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    }[c]));
  }

  function formatTime(timestamp) {
    const d = new Date(timestamp);
    return pad2(d.getHours()) + ":" + pad2(d.getMinutes());
  }

  function startOfDay(timestamp) {
    const d = new Date(timestamp);
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  }

  // 把时间戳格式化为“今天 / 昨天 / 8月3日 / 2025年8月3日”
  function formatDay(timestamp) {
    const today = startOfDay(Date.now());
    const day = startOfDay(timestamp);
    const diff = Math.round((today - day) / 86400000);
    if (diff === 0) return "今天";
    if (diff === 1) return "昨天";
    const d = new Date(timestamp);
    if (d.getFullYear() === new Date().getFullYear()) return (d.getMonth() + 1) + "月" + d.getDate() + "日";
    return d.getFullYear() + "年" + (d.getMonth() + 1) + "月" + d.getDate() + "日";
  }

  function formatDateTime(timestamp) {
    return formatDay(timestamp) + " " + formatTime(timestamp);
  }

  function formatDelay(seconds) {
    if (seconds < 60) return Math.max(1, Math.round(seconds)) + " 秒";
    const minutes = seconds / 60;
    const rounded = minutes < 10 ? Math.round(minutes * 10) / 10 : Math.round(minutes);
    return rounded + " 分钟";
  }

  function formatDuration(seconds) {
    const s = Math.max(0, Math.floor(seconds));
    return pad2(Math.floor(s / 60)) + ":" + pad2(s % 60);
  }

  // 把 YYYY-MM-DD 转成 “2026年8月3日”
  function formatDateLabel(dateStr) {
    const d = new Date(dateStr + "T00:00:00");
    if (Number.isNaN(d.getTime())) return dateStr || "";
    return d.getFullYear() + "年" + (d.getMonth() + 1) + "月" + d.getDate() + "日";
  }

  // 计算与今天相差的天数（正数=未来，负数=过去）
  function daysFromToday(dateStr) {
    const d = new Date(dateStr + "T00:00:00");
    if (Number.isNaN(d.getTime())) return 0;
    return Math.round((startOfDay(d.getTime()) - startOfDay(Date.now())) / 86400000);
  }

  function todayISO() {
    const d = new Date();
    return d.getFullYear() + "-" + pad2(d.getMonth() + 1) + "-" + pad2(d.getDate());
  }

  /* =======================================================
     2. 数据结构 / 读取 / 保存 / 迁移
     ======================================================= */
  function normalizeSettings(raw) {
    const source = raw && typeof raw === "object" ? raw : {};
    // 兼容旧版：minSeconds（秒）/ maxMinutes（分钟）
    const legacyMin = numberOr(source.minSeconds, DEFAULT_SETTINGS.delayMinSeconds);
    const legacyMaxSeconds = numberOr(source.maxMinutes, DEFAULT_SETTINGS.delayMaxSeconds / 60) * 60;

    let delayMin = clamp(Math.round(numberOr(source.delayMinSeconds, legacyMin)), 1, 600);
    let delayMax = clamp(Math.round(numberOr(source.delayMaxSeconds, legacyMaxSeconds)), 1, 600);
    if (delayMax < delayMin) delayMax = Math.min(600, delayMin + 1);

    const msg = source.proactiveMessage && typeof source.proactiveMessage === "object" ? source.proactiveMessage : {};
    let msgMin = clamp(Math.round(numberOr(msg.minMinutes, DEFAULT_SETTINGS.proactiveMessage.minMinutes)), 1, 1440);
    let msgMax = clamp(Math.round(numberOr(msg.maxMinutes, DEFAULT_SETTINGS.proactiveMessage.maxMinutes)), 1, 1440);
    if (msgMax < msgMin) msgMax = msgMin;

    const letter = source.proactiveLetter && typeof source.proactiveLetter === "object" ? source.proactiveLetter : {};
    let mailMin = clamp(Math.round(numberOr(letter.minHours, DEFAULT_SETTINGS.proactiveLetter.minHours)), 1, 720);
    let mailMax = clamp(Math.round(numberOr(letter.maxHours, DEFAULT_SETTINGS.proactiveLetter.maxHours)), 1, 720);
    if (mailMax < mailMin) mailMax = mailMin;

    // 兼容旧版：只有单个 replyCount 时，最少 / 最多都用这个值
    const legacyReply = source.replyCount === undefined ? null : Math.round(numberOr(source.replyCount, DEFAULT_SETTINGS.replyMin));
    let replyMin = clamp(Math.round(numberOr(source.replyMin, legacyReply === null ? DEFAULT_SETTINGS.replyMin : legacyReply)), 1, MAX_REPLY_COUNT);
    let replyMax = clamp(Math.round(numberOr(source.replyMax, legacyReply === null ? DEFAULT_SETTINGS.replyMax : legacyReply)), 1, MAX_REPLY_COUNT);
    if (replyMax < replyMin) replyMax = replyMin;

    return {
      charName: String(source.charName || DEFAULT_SETTINGS.charName).trim().slice(0, 12) || DEFAULT_SETTINGS.charName,
      userName: String(source.userName || DEFAULT_SETTINGS.userName).trim().slice(0, 12) || DEFAULT_SETTINGS.userName,
      replyMin,
      replyMax,
      delayMinSeconds: delayMin,
      delayMaxSeconds: delayMax,
      proactiveMessage: {
        on: msg.on === undefined ? DEFAULT_SETTINGS.proactiveMessage.on : Boolean(msg.on),
        minMinutes: msgMin,
        maxMinutes: msgMax
      },
      proactiveLetter: {
        on: letter.on === undefined ? DEFAULT_SETTINGS.proactiveLetter.on : Boolean(letter.on),
        minHours: mailMin,
        maxHours: mailMax
      },
      momentChance: clamp(Math.round(numberOr(source.momentChance, DEFAULT_SETTINGS.momentChance)), 0, 100)
    };
  }

  function normalizeMessage(raw) {
    if (!raw || typeof raw !== "object") return null;
    const role = raw.role === "me" || raw.role === "char" || raw.role === "system" ? raw.role : "char";
    return {
      id: typeof raw.id === "string" ? raw.id : uid(),
      role,
      kind: typeof raw.kind === "string" ? raw.kind : (role === "system" ? "system" : "text"),
      text: typeof raw.text === "string" ? raw.text : "",
      time: Number.isFinite(Number(raw.time)) ? Number(raw.time) : Date.now(),
      quote: raw.quote && typeof raw.quote === "object" ? {
        sender: String(raw.quote.sender || ""),
        snippet: String(raw.quote.snippet || "")
      } : null,
      meta: raw.meta && typeof raw.meta === "object" ? raw.meta : null,
      cardNo: Number.isFinite(Number(raw.cardNo)) ? Number(raw.cardNo) : null
    };
  }

  function seedMessages() {
    const now = Date.now();
    return [
      { id: uid(), role: "system", kind: "system", text: "字卡传讯已开启 · 今天也为你翻开一张", time: now - 8 * 60 * 1000 },
      { id: uid(), role: "char", kind: "text", text: "我在。今天想从哪里开始说起？", time: now - 6 * 60 * 1000, cardNo: 1 },
      { id: uid(), role: "char", kind: "text", text: "先靠近一点，让我看看你今天过得好不好。", time: now - 5 * 60 * 1000, cardNo: 2 }
    ];
  }

  /* ---------- 多梦角：单个梦角的独立数据 ---------- */

  // 空白梦角数据（不包含任何示例内容）
  function emptyCharData() {
    return {
      messages: [],
      calls: [],
      tarot: { records: [], favorites: [] },
      mail: { letters: [] },
      anniversaries: [],
      moments: [],
      diary: [],
      calendar: [],
      callQuotes: RANDOM_CALL_QUOTES.slice(),  // 模拟通话台词（每个梦角独立）
      cards: [],              // 字卡库（每个梦角独立）
      cardCategories: [],     // 字卡分类（每个梦角独立）
      // 音乐播放器（每个梦角独立）：歌单 + 当前索引 / 音量 / 模式 / 进度
      music: {
        tracks: [],
        state: { index: 0, volume: 60, mode: "list", position: 0 }
      }
    };
  }

  // 默认梦角数据（首个梦角带一段开场对话 + 一套初始字卡 + 演示歌单）
  function defaultCharData(seed) {
    const data = emptyCharData();
    const starter = buildStarterLibrary();
    data.cardCategories = starter.categories;
    data.cards = starter.cards;
    if (seed) {
      data.messages = seedMessages();
      // 首个梦角保留原有的 5 首演示曲目；新建梦角则是空歌单，
      // 这样既能延续原来的播放器体验，也能看到空歌单引导。
      data.music.tracks = DEFAULT_TRACKS.map((track) => ({
        id: uid(),
        title: track.title,
        artist: track.artist,
        kind: "demo",           // 演示曲目：没有真实音源
        src: "",
        dataUrl: "",
        storeKey: "",
        sessionOnly: false,
        duration: track.duration,
        createdAt: Date.now()
      }));
    }
    return data;
  }

  function defaultState() {
    const char = {
      id: uid(),
      name: DEFAULT_CHAR.name,
      avatar: "",
      note: DEFAULT_CHAR.note,
      tags: DEFAULT_CHAR.tags.slice(),
      deco: DEFAULT_CHAR.deco,
      heroBg: "",
      createdAt: Date.now(),
      data: defaultCharData(true)
    };
    return {
      version: 3,
      activeId: char.id,          // 当前激活的梦角 id
      chars: [char],              // 全部梦角档案
      settings: normalizeSettings(DEFAULT_SETTINGS),   // 聊天偏好（全局）
      prefs: {
        theme: "light",
        fontScale: 100,
        tab: "home",
        user: { name: DEFAULT_SETTINGS.userName, avatar: "", deco: "✦" },  // 用户资料
        appearance: Object.assign({}, DEFAULT_APPEARANCE)                  // 全局外观
      }
    };
  }

  /* ---------- 梦角数据代理 ----------
     把「当前激活梦角」的独立数据挂到 state 上，
     这样原先直接读写 state.messages / state.mail / state.tarot 的代码
     会自动落到当前梦角的独立数据里，天然实现多梦角数据隔离。 */
  function attachCharProxies(target) {
    const resolve = () => {
      let char = target.chars.find((item) => item.id === target.activeId);
      if (!char) {
        char = target.chars[0];
        target.activeId = char.id;
      }
      return char;
    };
    CHAR_DATA_KEYS.forEach((key) => {
      Object.defineProperty(target, key, {
        get() { return resolve().data[key]; },
        set(value) { resolve().data[key] = value; },
        // music 里可能包含 dataURL 音频，不能作为顶层字段重复写入 localStorage，
        // 否则一份音频会被存两次、白白占掉配额；它已经保存在 chars[].data.music 里。
        enumerable: key !== "music",
        configurable: true
      });
    });
    // 角色名同样跟随当前梦角（读的时候取梦角名，写的时候改梦角名）
    Object.defineProperty(target.settings, "charName", {
      get() { return resolve().name; },
      set(value) {
        const name = String(value || "").trim().slice(0, 12);
        if (name) resolve().name = name;
      },
      enumerable: true,
      configurable: true
    });
  }

  // 读取梦角数组；若是旧版结构则把所有数据装进第一个梦角
  function hydrateChars(target, parsed) {
    if (Array.isArray(parsed.chars) && parsed.chars.length) {
      target.chars = parsed.chars.slice(0, MAX_CHARS).map((raw, index) => normalizeChar(raw, index));
      target.activeId = target.chars.some((c) => c.id === parsed.activeId)
        ? parsed.activeId
        : target.chars[0].id;
      return;
    }
    const first = target.chars[0];
    const oldName = String((parsed.settings && parsed.settings.charName) || "").trim().slice(0, 12);
    if (oldName) first.name = oldName;
    target.activeId = first.id;
  }

  function normalizeCall(raw) {
    return {
      id: typeof raw.id === "string" ? raw.id : uid(),
      duration: clamp(Math.round(numberOr(raw.duration, 0)), 0, 86400),
      connected: Boolean(raw.connected),
      time: Number.isFinite(Number(raw.time)) ? Number(raw.time) : Date.now()
    };
  }

  function normalizeMoment(raw) {
    if (!raw || typeof raw !== "object") return null;
    const text = String(raw.text || "").slice(0, MAX_MOMENT);
    const source = raw.source && typeof raw.source === "object" ? {
      type: String(raw.source.type || "").slice(0, 10),
      ref: String(raw.source.ref || "").slice(0, 160)
    } : null;
    if (!text && !raw.image && !source) return null;
    return {
      id: typeof raw.id === "string" ? raw.id : uid(),
      role: raw.role === "me" ? "me" : "char",
      text,
      image: typeof raw.image === "string" ? raw.image : "",
      source,
      likes: clamp(Math.round(numberOr(raw.likes, 0)), 0, 9999),
      comments: Array.isArray(raw.comments)
        ? raw.comments
            .filter((c) => c && typeof c === "object")
            .map((c) => ({
              id: typeof c.id === "string" ? c.id : uid(),
              role: c.role === "char" ? "char" : "me",
              text: String(c.text || "").slice(0, 120),
              time: Number.isFinite(Number(c.time)) ? Number(c.time) : Date.now()
            }))
            .filter((c) => c.text)
        : [],
      time: Number.isFinite(Number(raw.time)) ? Number(raw.time) : Date.now()
    };
  }

  function normalizeDiary(raw) {
    if (!raw || typeof raw !== "object") return null;
    const title = String(raw.title || "").trim().slice(0, 30);
    const body = String(raw.body || "").slice(0, MAX_DIARY);
    if (!title && !body) return null;
    return {
      id: typeof raw.id === "string" ? raw.id : uid(),
      title,
      body,
      mood: DIARY_MOODS.includes(raw.mood) ? raw.mood : DIARY_MOODS[0],
      date: /^\d{4}-\d{2}-\d{2}$/.test(raw.date) ? raw.date : todayISO(),
      createdAt: Number.isFinite(Number(raw.createdAt)) ? Number(raw.createdAt) : Date.now(),
      updatedAt: Number.isFinite(Number(raw.updatedAt)) ? Number(raw.updatedAt) : Date.now()
    };
  }

  function normalizeCalEvent(raw) {
    if (!raw || typeof raw !== "object") return null;
    const title = String(raw.title || "").trim().slice(0, 24);
    if (!title) return null;
    return {
      id: typeof raw.id === "string" ? raw.id : uid(),
      title,
      type: CAL_TYPES.some((t) => t.key === raw.type) ? raw.type : "event",
      date: /^\d{4}-\d{2}-\d{2}$/.test(raw.date) ? raw.date : todayISO(),
      endDate: /^\d{4}-\d{2}-\d{2}$/.test(raw.endDate) ? raw.endDate : "",
      note: String(raw.note || "").slice(0, 200),
      createdAt: Number.isFinite(Number(raw.createdAt)) ? Number(raw.createdAt) : Date.now()
    };
  }

  // 归一化单个梦角的独立数据（用于读取新版存储）
  function normalizeCharData(raw) {
    const source = raw && typeof raw === "object" ? raw : {};
    const out = emptyCharData();
    if (Array.isArray(source.messages)) out.messages = source.messages.map(normalizeMessage).filter(Boolean);
    if (Array.isArray(source.calls)) out.calls = source.calls.filter((c) => c && typeof c === "object").map(normalizeCall);
    if (source.tarot && typeof source.tarot === "object") {
      out.tarot.records = Array.isArray(source.tarot.records)
        ? source.tarot.records.filter((r) => r && typeof r === "object").map((r) => ({
            id: typeof r.id === "string" ? r.id : uid(),
            question: String(r.question || "").slice(0, 40),
            time: Number.isFinite(Number(r.time)) ? Number(r.time) : Date.now(),
            cards: Array.isArray(r.cards) ? r.cards.filter((c) => c && c.name).map((c) => ({
              name: String(c.name),
              roman: String(c.roman || ""),
              reversed: Boolean(c.reversed),
              meaning: String(c.meaning || "")
            })) : []
          })) : [];
      out.tarot.favorites = Array.isArray(source.tarot.favorites)
        ? source.tarot.favorites.filter((f) => f && typeof f === "object").map((f) => ({
            id: typeof f.id === "string" ? f.id : uid(),
            name: String(f.name || ""),
            roman: String(f.roman || ""),
            reversed: Boolean(f.reversed),
            meaning: String(f.meaning || ""),
            question: String(f.question || ""),
            time: Number.isFinite(Number(f.time)) ? Number(f.time) : Date.now()
          })) : [];
    }
    if (source.mail && Array.isArray(source.mail.letters)) {
      out.mail.letters = source.mail.letters.map(normalizeLetter).filter((l) => l && (l.title || l.body));
    }
    if (Array.isArray(source.anniversaries)) {
      out.anniversaries = source.anniversaries.map(normalizeAnniversary).filter((a) => a && a.name);
    }
    if (Array.isArray(source.moments)) out.moments = source.moments.map(normalizeMoment).filter(Boolean);
    if (Array.isArray(source.diary)) out.diary = source.diary.map(normalizeDiary).filter(Boolean);
    if (Array.isArray(source.calendar)) out.calendar = source.calendar.map(normalizeCalEvent).filter(Boolean);
    if (Array.isArray(source.callQuotes) && source.callQuotes.length) {
      const quotes = source.callQuotes.filter((q) => typeof q === "string").map((q) => q.trim().slice(0, 60)).filter(Boolean);
      if (quotes.length) out.callQuotes = quotes.slice(0, 40);
    }
    // 字卡分类 + 字卡库（跟随梦角独立存储）
    if (Array.isArray(source.cardCategories)) {
      out.cardCategories = source.cardCategories.map(normalizeCategory).filter(Boolean).slice(0, MAX_CATEGORIES);
    }
    if (Array.isArray(source.cards)) {
      out.cards = source.cards.map(normalizeCard).filter(Boolean).slice(0, MAX_CARDS);
      // 分类被删除后，字卡自动落到「未分类」，避免出现悬空引用
      const ids = new Set(out.cardCategories.map((c) => c.id));
      out.cards.forEach((card) => {
        if (card.categoryId && !ids.has(card.categoryId)) card.categoryId = "";
      });
    }
    // 歌单 + 播放状态（跟随梦角独立存储）
    if (source.music && typeof source.music === "object") {
      out.music = normalizeMusic(source.music);
    }
    return out;
  }

  function normalizeChar(raw, index) {
    const source = raw && typeof raw === "object" ? raw : {};
    return {
      id: typeof source.id === "string" && source.id ? source.id : uid(),
      name: String(source.name || "").trim().slice(0, 12) || "梦角 " + (index + 1),
      avatar: typeof source.avatar === "string" ? source.avatar : "",
      note: String(source.note || "").trim().slice(0, 24),
      tags: Array.isArray(source.tags)
        ? source.tags.filter((t) => typeof t === "string").map((t) => t.trim().slice(0, 6)).filter(Boolean).slice(0, 4)
        : [],
      deco: CHAR_DECOS.includes(source.deco) ? source.deco : CHAR_DECOS[0],
      heroBg: typeof source.heroBg === "string" ? source.heroBg : "",
      createdAt: Number.isFinite(Number(source.createdAt)) ? Number(source.createdAt) : Date.now(),
      data: normalizeCharData(source.data)
    };
  }


  function normalizeAnniversary(raw) {
    if (!raw || typeof raw !== "object") return null;
    const type = ANN_TYPES.includes(raw.type) ? raw.type : "自定义";
    return {
      id: typeof raw.id === "string" ? raw.id : uid(),
      name: String(raw.name || "").trim().slice(0, 20),
      date: /^\d{4}-\d{2}-\d{2}$/.test(raw.date) ? raw.date : todayISO(),
      type,
      customType: String(raw.customType || "").trim().slice(0, 10),
      pinned: Boolean(raw.pinned),
      createdAt: Number.isFinite(Number(raw.createdAt)) ? Number(raw.createdAt) : Date.now()
    };
  }

  function normalizeLetter(raw) {
    if (!raw || typeof raw !== "object") return null;
    return {
      id: typeof raw.id === "string" ? raw.id : uid(),
      from: raw.from === "char" ? "char" : "me",
      title: String(raw.title || "").trim().slice(0, 40),
      body: String(raw.body || "").slice(0, MAX_LETTER),
      createdAt: Number.isFinite(Number(raw.createdAt)) ? Number(raw.createdAt) : Date.now(),
      updatedAt: Number.isFinite(Number(raw.updatedAt)) ? Number(raw.updatedAt) : Date.now()
    };
  }

  /* ---------- 音乐：歌曲与歌单归一化 ---------- */
  // 单首歌曲的数据结构：
  // kind = "url"（网络链接）/ "file"（本地导入）/ "demo"（无音源的演示曲目）
  // src 只保存网络地址；本地小文件存 dataUrl，大文件存 IndexedDB 的 storeKey。
  function normalizeTrack(raw) {
    if (!raw || typeof raw !== "object") return null;
    const title = String(raw.title || "").trim().slice(0, MAX_TRACK_TITLE);
    if (!title) return null;

    const artist = String(raw.artist || "").trim().slice(0, MAX_TRACK_ARTIST) || "未知";
    // 旧版歌曲只有名称 / 作者 / 时长，没有音源，统一视为演示曲目
    let kind = ["url", "file", "demo"].includes(raw.kind) ? raw.kind : "";
    // 过期的 blob: 地址在刷新后已经失效，不再保存
    const src = typeof raw.src === "string" && !/^blob:/i.test(raw.src) ? raw.src.slice(0, 2000) : "";
    const dataUrl = typeof raw.dataUrl === "string" && /^data:audio\//i.test(raw.dataUrl) ? raw.dataUrl : "";
    const storeKey = typeof raw.storeKey === "string" ? raw.storeKey.slice(0, 120) : "";
    if (!kind) kind = storeKey || dataUrl ? "file" : src ? "url" : "demo";
    // 标记为「仅本次会话」的本地文件：刷新后只剩一条记录，需要重新导入
    const sessionOnly = Boolean(raw.sessionOnly) && !src && !dataUrl && !storeKey;

    return {
      id: typeof raw.id === "string" && raw.id ? raw.id : uid(),
      title,
      artist,
      kind,
      src,
      dataUrl,
      storeKey,
      sessionOnly,
      // 0 表示「时长未知」，等音频元数据加载后再补上
      duration: clamp(Math.round(numberOr(raw.duration, 0)), 0, 60 * 60),
      createdAt: Number.isFinite(Number(raw.createdAt)) ? Number(raw.createdAt) : Date.now()
    };
  }

  // 归一化一个梦角的歌单与播放状态
  function normalizeMusic(raw) {
    const source = raw && typeof raw === "object" ? raw : {};
    const tracks = Array.isArray(source.tracks)
      ? source.tracks.map(normalizeTrack).filter(Boolean).slice(0, MAX_TRACKS)
      : [];
    const ms = source.state && typeof source.state === "object" ? source.state : {};
    return {
      tracks,
      state: {
        index: clamp(Math.round(numberOr(ms.index, 0)), 0, Math.max(0, tracks.length - 1)),
        volume: clamp(Math.round(numberOr(ms.volume, 60)), 0, 100),
        mode: PLAY_MODES.includes(ms.mode) ? ms.mode : "list",
        position: Math.max(0, numberOr(ms.position, 0))
      }
    };
  }

  function loadState() {
    const base = defaultState();
    try {
      // 依次尝试：新版 v3 → 上一版 v2 → 最初版 v1
      let raw = localStorage.getItem(STORAGE_KEY);
      let migrating = false;
      if (!raw) {
        raw = localStorage.getItem(LEGACY_V2_KEY) || localStorage.getItem(LEGACY_KEY);
        migrating = Boolean(raw);
      }
      if (!raw) return base;
      const parsed = JSON.parse(raw);
      const state = defaultState();

      // 多梦角：先接上「数据代理」与梦角数组，后面的字段填充逻辑
      // 就会自动写入当前激活梦角的独立数据里
      attachCharProxies(state);
      hydrateChars(state, parsed);

      state.settings = normalizeSettings(parsed.settings);
      // 旧版字卡是「全局字符串数组」，现在字卡跟随梦角独立存储。
      // 迁移策略：旧字卡复制进每个梦角的字卡库，归入「日常心语」；
      // 同时补回原本内置的 22 张大阿卡纳，保证抽卡功能开箱可用。
      if (Array.isArray(parsed.cards)) {
        const legacy = parsed.cards.map(normalizeCard).filter(Boolean).slice(0, MAX_CARDS);
        if (legacy.length) {
          state.chars.forEach((char) => {
            if (char.data.cards.length) return;   // 已有独立字卡的梦角不覆盖
            const tarotCat = { id: uid(), name: "大阿尔卡纳", createdAt: Date.now() };
            const dailyCat = { id: uid(), name: "日常心语", createdAt: Date.now() };
            char.data.cardCategories = [tarotCat, dailyCat];
            char.data.cards = [
              ...buildTarotCards(tarotCat.id),
              ...legacy.map((card) => Object.assign({}, card, { id: uid(), categoryId: dailyCat.id }))
            ].slice(0, MAX_CARDS);
          });
        }
      }
      if (Array.isArray(parsed.messages)) {
        state.messages = parsed.messages.map(normalizeMessage).filter(Boolean);
      }
      if (Array.isArray(parsed.calls)) {
        state.calls = parsed.calls
          .filter((c) => c && typeof c === "object")
          .map((c) => ({
            id: typeof c.id === "string" ? c.id : uid(),
            duration: clamp(Math.round(numberOr(c.duration, 0)), 0, 86400),
            connected: Boolean(c.connected),
            time: Number.isFinite(Number(c.time)) ? Number(c.time) : Date.now()
          }));
      }
      if (parsed.tarot && typeof parsed.tarot === "object") {
        state.tarot.records = Array.isArray(parsed.tarot.records)
          ? parsed.tarot.records.filter((r) => r && typeof r === "object").map((r) => ({
              id: typeof r.id === "string" ? r.id : uid(),
              question: String(r.question || "").slice(0, 40),
              time: Number.isFinite(Number(r.time)) ? Number(r.time) : Date.now(),
              cards: Array.isArray(r.cards) ? r.cards.filter((c) => c && c.name).map((c) => ({
                name: String(c.name),
                roman: String(c.roman || ""),
                reversed: Boolean(c.reversed),
                meaning: String(c.meaning || "")
              })) : []
            })) : [];
        state.tarot.favorites = Array.isArray(parsed.tarot.favorites)
          ? parsed.tarot.favorites.filter((f) => f && typeof f === "object").map((f) => ({
              id: typeof f.id === "string" ? f.id : uid(),
              name: String(f.name || ""),
              roman: String(f.roman || ""),
              reversed: Boolean(f.reversed),
              meaning: String(f.meaning || ""),
              question: String(f.question || ""),
              time: Number.isFinite(Number(f.time)) ? Number(f.time) : Date.now()
            })) : [];
      }
      if (parsed.mail && Array.isArray(parsed.mail.letters)) {
        state.mail.letters = parsed.mail.letters.map(normalizeLetter).filter((l) => l && (l.title || l.body));
      }
      if (Array.isArray(parsed.anniversaries)) {
        state.anniversaries = parsed.anniversaries.map(normalizeAnniversary).filter((a) => a && a.name);
      }
      // 旧版音乐是「全局歌单」，现在歌单跟随梦角独立存储。
      // 迁移策略：把旧歌单复制进每个还没有歌单的梦角，并沿用旧的播放状态；
      // 之后各梦角的歌单互不影响。
      // 注意：新格式的 state.music 只是当前梦角数据的代理，不会再写进顶层，
      // 但为了兼容旧存档，这里只处理「所有梦角都还没有 music 字段」的情况。
      const parsedChars = Array.isArray(parsed.chars) ? parsed.chars : [];
      const hasPerCharMusic = parsedChars.some((c) =>
        c && c.data && c.data.music && typeof c.data.music === "object"
      );
      if (!hasPerCharMusic && parsed.music && typeof parsed.music === "object") {
        const legacyMusic = normalizeMusic(parsed.music);
        state.chars.forEach((char) => {
          if (!char.data.music.tracks.length && legacyMusic.tracks.length) {
            char.data.music.tracks = legacyMusic.tracks.map((track) =>
              Object.assign({}, track, { id: uid() })
            );
          }
          char.data.music.state = {
            index: clamp(
              legacyMusic.state.index,
              0,
              Math.max(0, char.data.music.tracks.length - 1)
            ),
            volume: legacyMusic.state.volume,
            mode: legacyMusic.state.mode,
            position: legacyMusic.state.position
          };
        });
      }
      if (parsed.prefs && typeof parsed.prefs === "object") {
        state.prefs.theme = parsed.prefs.theme === "dark" ? "dark" : "light";
        state.prefs.fontScale = [90, 100, 110, 120].includes(Number(parsed.prefs.fontScale))
          ? Number(parsed.prefs.fontScale) : 100;
        state.prefs.tab = ["home", "settings", "mine"].includes(parsed.prefs.tab) ? parsed.prefs.tab : "home";
        // 用户资料（名称 / 头像 / 装饰图案）
        const user = parsed.prefs.user && typeof parsed.prefs.user === "object" ? parsed.prefs.user : {};
        state.prefs.user = {
          name: String(user.name || state.prefs.user.name).trim().slice(0, 12) || DEFAULT_SETTINGS.userName,
          avatar: typeof user.avatar === "string" ? user.avatar : "",
          deco: CHAR_DECOS.includes(user.deco) ? user.deco : state.prefs.user.deco
        };
        // 全局外观（背景图 / 透明度 / 气泡 CSS）
        const look = parsed.prefs.appearance && typeof parsed.prefs.appearance === "object" ? parsed.prefs.appearance : {};
        state.prefs.appearance = {
          pageBg: typeof look.pageBg === "string" ? look.pageBg : "",
          heroBg: typeof look.heroBg === "string" ? look.heroBg : "",
          annCardBg: typeof look.annCardBg === "string" ? look.annCardBg : "",
          musicCardBg: typeof look.musicCardBg === "string" ? look.musicCardBg : "",
          alpha: clamp(Math.round(numberOr(look.alpha, 100)), 40, 100),
          bubbleCss: typeof look.bubbleCss === "string" ? look.bubbleCss.slice(0, 4000) : ""
        };
      }
      // 数据读取完毕，重新接管角色名代理（settings 对象在上面被整体替换过）
      attachCharProxies(state);
      // 由旧版本迁移而来时，顺手写回新版存储，避免每次都要迁移
      if (migrating) {
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (error) { /* 忽略写入失败 */ }
      }
      return state;
    } catch (error) {
      return base;
    }
  }

  const state = loadState();
  attachCharProxies(state);

  /* ---------- 多梦角：当前激活梦角 ---------- */
  function activeChar() {
    let char = state.chars.find((item) => item.id === state.activeId);
    if (!char) {
      char = state.chars[0];
      state.activeId = char.id;
    }
    return char;
  }

  // 当前用户资料（全局）
  function currentUser() {
    return state.prefs.user;
  }

  // 生成一个合法的梦角名称（用于新增时的默认值）
  function nextCharName() {
    let index = state.chars.length + 1;
    let name = "梦角 " + index;
    const used = state.chars.map((c) => c.name);
    while (used.includes(name)) {
      index += 1;
      name = "梦角 " + index;
    }
    return name;
  }

  // 运行期 UI 状态（不持久化）
  const ui = {
    // 每次进入应用都默认停留在【主页面】
    tab: "home",
    pageStack: [],
    quoteDraft: null,
    replyQueue: [],
    processing: false,
    typing: false,
    sessionVersion: 0,
    currentDelay: null,
    newMessageId: null,
    cardFilter: "all",        // 字卡库当前筛选：all / none（未分类）/ 分类 id
    cardQuery: "",
    tarotScope: "all",        // 抽卡范围：all / none / 分类 id
    actionMessageId: null,
    recording: null,
    recordTimer: null,
    ignoreMicClickUntil: 0,
    suppressClickUntil: 0,
    storageWarned: false,
    currentCall: null,
    doodle: null,
    tarotFilter: false,       // 塔罗记录：是否只看收藏
    mailEditingId: null,      // 正在编辑的信件 id（null = 新建）
    annEditingId: null,       // 正在编辑的纪念日 id
    playing: false,           // 音乐是否正在播放
    musicTimer: null,
    musicBusy: false,         // 本地音频是否正在读取 / 入库
    musicImportReturn: "addPage", // 本地音频导入完成后回到哪里：manager / addManager / addPage
    seeking: false,
    // —— 多梦角版本新增 ——
    momentImage: "",          // 朋友圈配图（待发布）
    diaryEditingId: null,     // 正在编辑的日记 id（null = 新建）
    calEditingId: null,       // 正在编辑的日历记录 id
    calCursor: new Date(),    // 日历当前显示的月份
    calSelected: todayISO(),  // 日历当前选中的日期
    charPanelOpen: false      // 梦角面板是否打开
  };

  /* =======================================================
     3. DOM 引用
     ======================================================= */
  const $ = (id) => document.getElementById(id);

  const dom = {
    phone: $("phone"),
    appBody: $("appBody"),
    bottomNav: $("bottomNav"),
    // Tab 页
    tabHome: $("tabHome"),
    tabSettings: $("tabSettings"),
    tabMine: $("tabMine"),
    // —— 主页面：头图卡片 ——
    homeScroll: $("homeScroll"),
    homeThemeBtn: $("homeThemeBtn"),
    homeMineBtn: $("homeMineBtn"),
    homeSettingsBtn: $("homeSettingsBtn"),
    heroCard: $("heroCard"),
    heroBg: $("heroBg"),
    heroBgBtn: $("heroBgBtn"),
    heroSwitch: $("heroSwitch"),
    heroAvatarMe: $("heroAvatarMe"),
    heroAvatarChar: $("heroAvatarChar"),
    heroUserName: $("heroUserName"),
    heroUserDeco: $("heroUserDeco"),
    heroCharName: $("heroCharName"),
    heroCharDeco: $("heroCharDeco"),
    heroNote: $("heroNote"),
    heroTags: $("heroTags"),
    // —— 主页面：纪念日卡片 + 音乐小组件 ——
    duoAnn: $("duoAnn"),
    duoMusic: $("duoMusic"),
    annBig: $("annBig"),
    annName: $("annName"),
    annSub: $("annSub"),
    miniOpen: $("miniOpen"),
    miniArt: $("miniArt"),
    miniTitle: $("miniTitle"),
    miniTime: $("miniTime"),
    miniSeek: $("miniSeek"),
    miniSeekFill: $("miniSeekFill"),
    miniPrev: $("miniPrev"),
    miniPlay: $("miniPlay"),
    miniNext: $("miniNext"),
    miniDate: $("miniDate"),
    // —— 主页面：宫格 ——
    gridEntries: $("gridEntries"),
    // —— 底部导航（三个 Tab） ——
    navItems: Array.from(document.querySelectorAll("#bottomNav .nav-item")),
    // —— 设置页 ——
    themeGroup: $("themeGroup"),
    appearanceThemeGroup: $("appearanceThemeGroup"),
    fontGroup: $("fontGroup"),
    fontScaleLabel: $("fontScaleLabel"),
    openAppearance: $("openAppearance"),
    appearanceSub: $("appearanceSub"),
    openChatPrefs: $("openChatPrefs"),
    chatPrefsSub: $("chatPrefsSub"),
    charManagerSub: $("charManagerSub"),
    exportChatBtn: $("exportChatBtn"),
    importChatBtn: $("importChatBtn"),
    openCallHistory: $("openCallHistory"),
    callHistorySub: $("callHistorySub"),
    clearAllBtn: $("clearAllBtn"),
    storageNote: $("storageNote"),
    // —— 我的页 ——
    mineProfile: $("mineProfile"),
    mineUserAvatar: $("mineUserAvatar"),
    mineUserName: $("mineUserName"),
    mineUserDeco: $("mineUserDeco"),
    charCountLabel: $("charCountLabel"),
    openCharManager: $("openCharManager"),
    favCountLabel: $("favCountLabel"),
    favList: $("favList"),
    mineStats: $("mineStats"),
    mineStatsSub: $("mineStatsSub"),
    // —— 梦角面板 ——
    charLayer: $("charLayer"),
    charPanelList: $("charPanelList"),
    charPanelAdd: $("charPanelAdd"),
    charPanelClose: $("charPanelClose"),
    charPanelTitle: $("charPanelTitle"),
    settingsCharBtn: $("settingsCharBtn"),
    settingsCharCount: $("settingsCharCount"),
    // —— 朋友圈 ——
    momentCharBtn: $("momentCharBtn"),
    momentInput: $("momentInput"),
    momentImageBtn: $("momentImageBtn"),
    momentThumb: $("momentThumb"),
    momentThumbImg: $("momentThumbImg"),
    momentThumbClear: $("momentThumbClear"),
    momentPostBtn: $("momentPostBtn"),
    momentCountLabel: $("momentCountLabel"),
    momentsList: $("momentsList"),
    // —— 日记 ——
    diaryAddBtn: $("diaryAddBtn"),
    diaryCountLabel: $("diaryCountLabel"),
    diaryList: $("diaryList"),
    // —— 日历 ——
    calAddBtn: $("calAddBtn"),
    calPrev: $("calPrev"),
    calNext: $("calNext"),
    calMonth: $("calMonth"),
    calGrid: $("calGrid"),
    calDayTitle: $("calDayTitle"),
    calDayCount: $("calDayCount"),
    calDayList: $("calDayList"),
    // —— 外观设置 ——
    bgGrid: $("bgGrid"),
    alphaRange: $("alphaRange"),
    alphaLabel: $("alphaLabel"),
    bubbleCssInput: $("bubbleCssInput"),
    bubbleCssSave: $("bubbleCssSave"),
    bubbleCssReset: $("bubbleCssReset"),
    // —— 消息统计 / 通话历史 ——
    statsGrid: $("statsGrid"),
    statsCharName: $("statsCharName"),
    statsCharList: $("statsCharList"),
    callPageCount: $("callPageCount"),
    callList: $("callList"),
    // 聊天页
    backBtn: $("backBtn"),
    chat: $("chat"),
    messageList: $("messageList"),
    charNameLabel: $("charNameLabel"),
    chatSubtitle: $("chatSubtitle"),
    moreBtn: $("moreBtn"),
    moreBadge: $("moreBadge"),
    scrollDown: $("scrollDown"),
    dock: $("dock"),
    composer: $("composer"),
    messageInput: $("messageInput"),
    sendBtn: $("sendBtn"),
    micBtn: $("micBtn"),
    emojiBtn: $("emojiBtn"),
    plusBtn: $("plusBtn"),
    quoteDraft: $("quoteDraft"),
    quoteDraftName: $("quoteDraftName"),
    quoteDraftText: $("quoteDraftText"),
    quoteDraftClose: $("quoteDraftClose"),
    toolPanel: $("toolPanel"),
    toolMode: $("toolMode"),
    toolsScrollMe: $("toolsScrollMe"),
    toolsScrollChar: $("toolsScrollChar"),
    toolDotsMe: $("toolDotsMe"),
    emojiPanel: $("emojiPanel"),
    emojiGrid: $("emojiGrid"),
    kaomojiGrid: $("kaomojiGrid"),
    emojiTabs: Array.from(document.querySelectorAll(".emoji-tab")),
    closeEmoji: $("closeEmoji"),
    panelScrim: $("panelScrim"),
    recordingHint: $("recordingHint"),
    recordTime: $("recordTime"),
    // 字卡库
    cardCountLabel: $("cardCountLabel"),
    cardsBody: $("cardsBody"),
    importCardsBtn: $("importCardsBtn"),
    exportCardsBtn: $("exportCardsBtn"),
    manageCatsBtn: $("manageCatsBtn"),
    newCardBtn: $("newCardBtn"),
    catBar: $("catBar"),
    catGuide: $("catGuide"),
    createCatBtn: $("createCatBtn"),
    cardSearch: $("cardSearch"),
    visibleCardCount: $("visibleCardCount"),
    cardList: $("cardList"),
    // 塔罗
    tarotFavBtn: $("tarotFavBtn"),
    tarotQuestion: $("tarotQuestion"),
    tarotScopeBar: $("tarotScopeBar"),
    drawOneBtn: $("drawOneBtn"),
    drawThreeBtn: $("drawThreeBtn"),
    tarotResult: $("tarotResult"),
    tarotRecordCount: $("tarotRecordCount"),
    tarotRecordList: $("tarotRecordList"),
    // 信箱
    mailBack: $("mailBack"),
    mailTitle: $("mailTitle"),
    mailComposeBtn: $("mailComposeBtn"),
    mailListView: $("mailListView"),
    mailList: $("mailList"),
    mailEditorView: $("mailEditorView"),
    mailTitleInput: $("mailTitleInput"),
    mailBodyInput: $("mailBodyInput"),
    mailEditorMeta: $("mailEditorMeta"),
    mailCancelBtn: $("mailCancelBtn"),
    mailSaveBtn: $("mailSaveBtn"),
    // 纪念日
    annAddBtn: $("annAddBtn"),
    annList: $("annList"),
    // 音乐
    musicAddBtn: $("musicAddBtn"),
    openPlaylistBtn: $("openPlaylistBtn"),
    musicFileInput: $("musicFileInput"),
    playerArt: $("playerArt"),
    playerTitle: $("playerTitle"),
    playerArtist: $("playerArtist"),
    playerCurrent: $("playerCurrent"),
    playerSeek: $("playerSeek"),
    playerDuration: $("playerDuration"),
    playerMode: $("playerMode"),
    playerPrev: $("playerPrev"),
    playerPlay: $("playerPlay"),
    playerNext: $("playerNext"),
    playerVolumeIcon: $("playerVolumeIcon"),
    playerVolume: $("playerVolume"),
    playerVolumeLabel: $("playerVolumeLabel"),
    playerNote: $("playerNote"),
    playlistCount: $("playlistCount"),
    playlist: $("playlist"),
    // 聊天设置面板
    settingsLayer: $("settingsLayer"),
    settingsAvatar: $("settingsAvatar"),
    charNameInput: $("charNameInput"),
    userNameInput: $("userNameInput"),
    replyMinInput: $("replyMinInput"),
    replyMaxInput: $("replyMaxInput"),
    replyModeHint: $("replyModeHint"),
    replyMinMinus: $("replyMinMinus"),
    replyMinPlus: $("replyMinPlus"),
    replyMaxMinus: $("replyMaxMinus"),
    replyMaxPlus: $("replyMaxPlus"),
    minSecondsInput: $("minSecondsInput"),
    maxSecondsInput: $("maxSecondsInput"),
    delayPreview: $("delayPreview"),
    proactiveMsgSection: $("proactiveMsgSection"),
    proactiveMsgToggle: $("proactiveMsgToggle"),
    proactiveMsgMinInput: $("proactiveMsgMinInput"),
    proactiveMsgMaxInput: $("proactiveMsgMaxInput"),
    proactiveMailSection: $("proactiveMailSection"),
    proactiveMailToggle: $("proactiveMailToggle"),
    proactiveMailMinInput: $("proactiveMailMinInput"),
    proactiveMailMaxInput: $("proactiveMailMaxInput"),
    momentChanceInput: $("momentChanceInput"),
    settingsCardCount: $("settingsCardCount"),
    openCardsBtn: $("openCardsBtn"),
    saveSettings: $("saveSettings"),
    closeSettings: $("closeSettings"),
    clearChatBtn: $("clearChatBtn"),
    // 消息操作 / 通话 / 弹窗 / 提示
    actionLayer: $("actionLayer"),
    actionPreview: $("actionPreview"),
    actionList: $("actionList"),
    actionCancel: $("actionCancel"),
    callLayer: $("callLayer"),
    callMinimize: $("callMinimize"),
    callName: $("callName"),
    callAvatar: $("callAvatar"),
    callStatus: $("callStatus"),
    callTimer: $("callTimer"),
    callQuote: $("callQuote"),
    muteBtn: $("muteBtn"),
    speakerBtn: $("speakerBtn"),
    hangupBtn: $("hangupBtn"),
    callMini: $("callMini"),
    callMiniName: $("callMiniName"),
    callMiniTimer: $("callMiniTimer"),
    genericLayer: $("genericLayer"),
    genericDialog: $("genericDialog"),
    toastHost: $("toastHost"),
    imageInput: $("imageInput"),
    cameraInput: $("cameraInput"),
    cardsFileInput: $("cardsFileInput"),
    chatFileInput: $("chatFileInput"),
    bgFileInput: $("bgFileInput"),
    momentFileInput: $("momentFileInput"),
    avatarFileInput: $("avatarFileInput"),
    introPaperName: document.querySelector(".paper-card-a small")
  };


  function makeIcon(name, className) {
    const svg = document.createElementNS(SVG_NS, "svg");
    svg.setAttribute("class", className || "icon");
    const use = document.createElementNS(SVG_NS, "use");
    use.setAttribute("href", "#i-" + name);
    svg.appendChild(use);
    return svg;
  }

  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function initialOf(name) {
    const chars = Array.from(String(name || "梦").trim());
    return chars[0] || "梦";
  }

  /* =======================================================
     4. 持久化
     ======================================================= */
  function persist(options) {
    const opts = options || {};
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      updateStorageNote();
      return true;
    } catch (error) {
      if (!ui.storageWarned && !opts.silent) {
        ui.storageWarned = true;
        showToast("浏览器存储空间不足，新内容只在本次打开期间保留", { icon: "clock", duration: 3800 });
      }
      return false;
    }
  }

  // 估算已占用的本地空间
  function updateStorageNote() {
    if (!dom.storageNote) return;
    try {
      const raw = localStorage.getItem(STORAGE_KEY) || "";
      const kb = raw.length / 1024;
      dom.storageNote.innerHTML = "已使用 <b>" + (kb < 1 ? kb.toFixed(2) : kb.toFixed(1)) + " KB</b> 本地空间";
    } catch (error) {
      dom.storageNote.textContent = "本地空间读取失败";
    }
  }

  /* =======================================================
     5. 提示 Toast / 通用弹窗
     ======================================================= */
  function showToast(message, options) {
    const opts = options || {};
    const toast = el("div", "toast");
    if (opts.icon) toast.appendChild(makeIcon(opts.icon, "icon toast-icon"));
    toast.appendChild(el("span", "", message));

    let timer = null;
    const remove = () => {
      if (!toast.isConnected) return;
      toast.classList.add("out");
      setTimeout(() => toast.remove(), 260);
    };

    if (opts.actionLabel && typeof opts.onAction === "function") {
      const action = el("button", "toast-action", opts.actionLabel);
      action.type = "button";
      action.addEventListener("click", () => {
        clearTimeout(timer);
        opts.onAction();
        remove();
      });
      toast.appendChild(action);
    }

    dom.toastHost.appendChild(toast);
    while (dom.toastHost.children.length > 3) dom.toastHost.firstElementChild.remove();
    timer = setTimeout(remove, opts.duration || 2500);
  }

  function closeModal() {
    dom.genericLayer.classList.remove("open");
    dom.genericLayer.setAttribute("aria-hidden", "true");
  }

  // 打开一个通用弹窗
  function openModal(options) {
    const opts = options || {};
    const dialog = dom.genericDialog;
    dialog.replaceChildren();

    const mark = el("div", "modal-mark");
    mark.appendChild(makeIcon(opts.icon || "sparkle"));
    const title = el("h3", "", opts.title || "写点什么");
    const body = el("div", "modal-body");
    if (opts.body) {
      if (opts.body instanceof Node) body.appendChild(opts.body);
      else body.innerHTML = opts.body;
    }
    const actions = el("div", "modal-actions");
    const cancel = el("button", "cancel", opts.cancelText || "取消");
    cancel.type = "button";
    const confirm = el("button", opts.confirmClass || "confirm", opts.confirmText || "确认");
    confirm.type = "button";
    actions.appendChild(cancel);
    actions.appendChild(confirm);

    dialog.appendChild(mark);
    dialog.appendChild(title);
    if (opts.sub) dialog.appendChild(el("p", "modal-sub", opts.sub));
    if (opts.body) dialog.appendChild(body);
    // footer: false 时，由 body 内部自带按钮，不再渲染底部的取消 / 确认
    if (opts.footer !== false) dialog.appendChild(actions);

    cancel.addEventListener("click", closeModal);
    confirm.addEventListener("click", async () => {
      if (confirm.dataset.busy === "1") return;
      confirm.dataset.busy = "1";
      confirm.disabled = true;
      try {
        const result = opts.onConfirm ? await opts.onConfirm(dialog) : true;
        if (result !== false) closeModal();
      } catch (error) {
        showToast("操作没有完成，请再试一次", { icon: "close" });
      } finally {
        confirm.disabled = false;
        delete confirm.dataset.busy;
      }
    });

    dialog.scrollTop = 0;
    dom.genericLayer.classList.add("open");
    dom.genericLayer.setAttribute("aria-hidden", "false");
    if (typeof opts.onMount === "function") opts.onMount(dialog);
    setTimeout(() => {
      const first = dialog.querySelector("input:not([type=hidden]), textarea, select");
      if (first) first.focus();
    }, 180);
  }

  function openConfirm(options) {
    const opts = options || {};
    openModal({
      icon: opts.icon || "sparkle",
      title: opts.title || "确认操作",
      sub: opts.sub || "",
      confirmText: opts.confirmText || "确认",
      confirmClass: opts.danger ? "danger" : "confirm",
      onConfirm: opts.onConfirm
    });
  }

  /* =======================================================
     6. 导航：Tab 切换 + 子页面进出
     ======================================================= */
  const TAB_MAP = { home: "tabHome", settings: "tabSettings", mine: "tabMine" };

  function switchTab(tab) {
    const name = TAB_MAP[tab] ? tab : "home";
    ui.tab = name;
    state.prefs.tab = name;
    Object.keys(TAB_MAP).forEach((key) => {
      const view = dom[TAB_MAP[key]];
      if (view) view.classList.toggle("is-active", key === name);
    });
    if (name === "mine") renderMine();
    if (name === "settings") renderSettingsTab();
    if (name === "home") renderHome();
    updateNavState();
    persist();
  }

  // 同步底部三个 Tab 的选中高亮（主页面 / 设置 / 我的）
  function updateNavState() {
    dom.navItems.forEach((btn) => {
      const active = btn.dataset.tab === ui.tab;
      btn.classList.toggle("is-active", active);
      if (active) btn.setAttribute("aria-current", "page");
      else btn.removeAttribute("aria-current");
    });
    renderSubBar();
  }

  // 打开子页面（入栈）
  function openPage(page) {
    const node = document.getElementById("page" + page.charAt(0).toUpperCase() + page.slice(1));
    if (!node) return;
    closePanels();
    closeActionSheet();
    // 同一个页面重复打开时先归一
    if (ui.pageStack[ui.pageStack.length - 1] !== page) ui.pageStack.push(page);
    node.classList.add("is-open");
    node.setAttribute("aria-hidden", "false");
    if (page === "chat") { renderHeader(); renderMessages(); }
    if (page === "tarot") renderTarot();
    if (page === "mail") showMailList();
    if (page === "anniversary") renderAnniversary();
    if (page === "music") { renderPlaylist(); renderPlayer(); }
    if (page === "cards") { renderCards(); dom.cardsBody.scrollTop = 0; }
    if (page === "moments") renderMoments();
    if (page === "diary") renderDiary();
    if (page === "calendar") renderCalendar();
    if (page === "appearance") renderAppearance();
    if (page === "stats") renderStats();
    if (page === "callHistory") renderCallHistory();
    updateNavState();
  }

  // 关闭当前子页面（出栈）
  function closePage() {
    const page = ui.pageStack.pop();
    if (page) {
      const node = document.getElementById("page" + page.charAt(0).toUpperCase() + page.slice(1));
      if (node) {
        node.classList.remove("is-open");
        node.setAttribute("aria-hidden", "true");
      }
    }
    updateNavState();
  }

  /* =======================================================
     7. 偏好设置：主题 / 字体大小 / 外观（背景、透明度、气泡）
     ======================================================= */

  // 把「气泡 CSS 自定义」注入页面（只保留 CSS 声明，避免引入外部资源）
  function applyBubbleCss() {
    let node = document.getElementById("customBubbleStyle");
    if (!node) {
      node = document.createElement("style");
      node.id = "customBubbleStyle";
      document.head.appendChild(node);
    }
    const raw = String(state.prefs.appearance.bubbleCss || "").trim();
    if (!raw) {
      node.textContent = "";
      return;
    }
    node.textContent = raw.replace(/[<>]/g, "").replace(/@import[^;]*;?/gi, "");
  }

  // 把「外观设置」里的背景图 / 透明度写到 CSS 变量上
  function applyAppearance() {
    const look = state.prefs.appearance;
    const root = document.documentElement;
    const char = activeChar();
    const heroImage = char.heroBg || look.heroBg;
    root.style.setProperty("--page-bg-image", look.pageBg ? 'url("' + look.pageBg + '")' : "none");
    root.style.setProperty("--hero-bg-image", heroImage ? 'url("' + heroImage + '")' : "none");
    root.style.setProperty("--ann-bg-image", look.annCardBg ? 'url("' + look.annCardBg + '")' : "none");
    root.style.setProperty("--music-bg-image", look.musicCardBg ? 'url("' + look.musicCardBg + '")' : "none");
    root.style.setProperty("--card-alpha", String(clamp(numberOr(look.alpha, 100), 40, 100) / 100));
    applyBubbleCss();
  }

  function applyPrefs() {
    document.documentElement.dataset.theme = state.prefs.theme;
    document.documentElement.style.setProperty("--app-scale", String(state.prefs.fontScale / 100));
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", state.prefs.theme === "dark" ? "#191420" : "#f7f1fb");
    applyAppearance();
  }

  function setTheme(theme) {
    state.prefs.theme = theme === "dark" ? "dark" : "light";
    applyPrefs();
    persist();
    renderSettingsTab();
    if (ui.pageStack.includes("appearance")) renderAppearance();
    if (dom.homeThemeBtn) {
      dom.homeThemeBtn.replaceChildren(makeIcon(state.prefs.theme === "dark" ? "sun" : "moon"));
    }
  }

  function setFontScale(scale) {
    state.prefs.fontScale = [90, 100, 110, 120].includes(Number(scale)) ? Number(scale) : 100;
    applyPrefs();
    persist();
    renderSettingsTab();
  }

  // 外观设置的一句话摘要
  function appearanceSummary() {
    const look = state.prefs.appearance;
    const bgCount = [look.pageBg, activeChar().heroBg || look.heroBg, look.annCardBg, look.musicCardBg]
      .filter(Boolean).length;
    return (state.prefs.theme === "dark" ? "深色" : "浅色") +
      " · 透明度 " + clamp(numberOr(look.alpha, 100), 40, 100) + "%" +
      " · 背景图 " + bgCount + " 张";
  }

  // 生成头像内容：有自定义图片就用图片，否则显示名字首字
  function applyAvatar(node, name, image) {
    if (!node) return;
    node.replaceChildren();
    if (image) {
      const img = el("img", "avatar-img");
      img.src = image;
      img.alt = name || "头像";
      node.appendChild(img);
    } else {
      node.textContent = initialOf(name);
    }
  }

  /* =======================================================
     8. 主页面 / 我的 / 设置 渲染
     ======================================================= */
  function renderHome() {
    const char = activeChar();
    const user = currentUser();

    /* ---- 头图卡片：双头像 + 双方名称 + 装饰图案 ---- */
    dom.heroUserName.textContent = user.name;
    dom.heroUserDeco.textContent = user.deco || "";
    dom.heroCharName.textContent = char.name;
    dom.heroCharDeco.textContent = char.deco || "";
    dom.heroNote.textContent = char.note || "还没有写下备注";
    applyAvatar(dom.heroAvatarMe, user.name, user.avatar);
    applyAvatar(dom.heroAvatarChar, char.name, char.avatar);

    dom.heroTags.replaceChildren();
    (char.tags || []).slice(0, 4).forEach((tag) => {
      dom.heroTags.appendChild(el("span", "tag-pill", tag));
    });

    const heroImage = char.heroBg || state.prefs.appearance.heroBg;
    dom.heroCard.classList.toggle("has-bg", Boolean(heroImage));

    /* ---- 纪念日卡片 ---- */
    const sorted = sortAnniversaries();
    if (sorted.length) {
      const next = sorted.find((a) => daysFromToday(a.date) >= 0) || sorted[0];
      const diff = daysFromToday(next.date);
      dom.annBig.textContent = diff === 0 ? "今天" : String(Math.abs(diff));
      dom.annName.textContent = next.name;
      dom.annSub.textContent = diff > 0
        ? "还有 " + diff + " 天"
        : diff === 0 ? "就是今天" : "已过去 " + Math.abs(diff) + " 天";
    } else {
      dom.annBig.textContent = "＋";
      dom.annName.textContent = "点这里记下重要的日子";
      dom.annSub.textContent = "还没有纪念日";
    }

    /* ---- 音乐小组件 + 次级功能栏 ---- */
    renderMiniPlayer();
    renderSubBar();
    if (dom.appearanceSub) dom.appearanceSub.textContent = appearanceSummary();
  }

  // 次级功能栏：选中项高亮（当前停留在哪个子页就点亮哪个）
  function renderSubBar() {
    if (!dom.subBar) return;
    const current = ui.pageStack[ui.pageStack.length - 1] || "";
    const map = { appearance: "appearance", cards: "cards", chatPrefs: "chatPrefs", stats: "stats" };
    Array.from(dom.subBar.querySelectorAll(".sub-chip")).forEach((chip) => {
      const key = chip.dataset.sub;
      chip.classList.toggle("is-active", Boolean(map[key]) && map[key] === current);
    });
  }

  // 主页里内嵌的音乐小组件
  function renderMiniPlayer() {
    const track = currentTrack();
    const music = state.music.state;
    const duration = track ? trackDuration(track) : 0;
    if (track) {
      dom.miniTitle.textContent = track.title;
      dom.miniTime.textContent = formatDuration(music.position) + " / " + formatDuration(duration);
    } else {
      dom.miniTitle.textContent = "还没有歌曲";
      dom.miniTime.textContent = "00:00 / 00:00";
    }
    const percent = track && duration ? clamp((music.position / duration) * 100, 0, 100) : 0;
    dom.miniSeekFill.style.width = percent + "%";
    dom.miniPlay.replaceChildren(makeIcon(ui.playing ? "pause" : "play"));
    dom.miniArt.classList.toggle("is-spinning", ui.playing);

    const now = new Date();
    const week = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"][now.getDay()];
    dom.miniDate.textContent = (now.getMonth() + 1) + "月" + now.getDate() + "日 " + week;
  }

  function renderSettingsTab() {
    // 两个主题选择组（设置页 + 外观页）一起同步
    [dom.themeGroup, dom.appearanceThemeGroup].forEach((group) => {
      if (!group) return;
      Array.from(group.querySelectorAll(".seg-btn")).forEach((btn) => {
        const active = btn.dataset.themeValue === state.prefs.theme;
        btn.classList.toggle("is-active", active);
        btn.setAttribute("aria-checked", active ? "true" : "false");
      });
    });
    Array.from(dom.fontGroup.querySelectorAll(".seg-btn")).forEach((btn) => {
      const active = Number(btn.dataset.fontValue) === state.prefs.fontScale;
      btn.classList.toggle("is-active", active);
      btn.setAttribute("aria-checked", active ? "true" : "false");
    });
    dom.fontScaleLabel.textContent = (state.prefs.fontScale === 100 ? "标准" : "") + " " + state.prefs.fontScale + "%";
    dom.chatPrefsSub.textContent = "当前角色：" + activeChar().name;
    dom.appearanceSub.textContent = appearanceSummary();
    renderCallHistory();
    updateStorageNote();
  }

  // 生成一个“空状态”卡片
  function buildEmptySlot(icon, title, desc) {
    const box = el("div", "empty-slot");
    box.appendChild(makeIcon(icon));
    box.appendChild(el("b", "", title));
    if (desc) box.appendChild(el("p", "", desc));
    return box;
  }

  function renderMine() {
    const user = currentUser();
    dom.mineUserName.textContent = user.name;
    dom.mineUserDeco.textContent = user.deco || "";
    applyAvatar(dom.mineUserAvatar, user.name, user.avatar);

    // 梦角设置入口（切换 / 新增 / 编辑 / 删除都在面板里）
    dom.charCountLabel.textContent = "共 " + state.chars.length + " 位";
    dom.charManagerSub.textContent = "当前：" + activeChar().name + " · 点一下切换或编辑";

    // 当前梦角的数据概览
    renderStatGrid(dom.mineStats, activeChar());
    dom.mineStatsSub.textContent = "当前：" + activeChar().name;

    renderFavorites();
  }

  // 数据概览小格子
  function renderStatGrid(container, char) {
    if (!container) return;
    const data = char.data;
    const mineCount = data.messages.filter((m) => m.role === "me").length;
    const charCount = data.messages.filter((m) => m.role === "char").length;
    const items = [
      ["消息", data.messages.length, "card"],
      ["我发的", mineCount, "user"],
      ["TA 发的", charCount, "heart"],
      ["信件", data.mail.letters.length, "envelope"],
      ["塔罗", data.tarot.records.length, "tarot"],
      ["收藏", data.tarot.favorites.length, "star"],
      ["纪念日", data.anniversaries.length, "calendar"],
      ["朋友圈", data.moments.length, "world"],
      ["日记", data.diary.length, "book"],
      ["日历", data.calendar.length, "clock"],
      ["通话", data.calls.length, "phone"]
    ];
    container.replaceChildren();
    items.forEach((item) => {
      const cell = el("div", "stat-cell");
      cell.appendChild(makeIcon(item[2], "icon stat-icon"));
      cell.appendChild(el("b", "", String(item[1])));
      cell.appendChild(el("small", "", item[0]));
      container.appendChild(cell);
    });
  }

  function renderFavorites() {
    const list = state.tarot.favorites;
    dom.favCountLabel.textContent = list.length + " 条";
    if (!list.length) {
      dom.favList.replaceChildren(buildEmptySlot("star", "还没有收藏的传讯", "去塔罗页抽一张字卡，点亮右上角的小星星就能收藏。"));
      return;
    }
    const frag = document.createDocumentFragment();
    list.slice().sort((a, b) => b.time - a.time).forEach((fav) => {
      const item = el("div", "list-item");
      const main = el("div", "list-item-main");
      main.appendChild(el("b", "", fav.name + (fav.reversed ? "（逆位）" : "（正位）")));
      main.appendChild(el("p", "", fav.meaning));
      main.appendChild(el("small", "", formatDateTime(fav.time) + (fav.question ? " · " + fav.question : "")));
      item.appendChild(main);
      const actions = el("div", "list-item-actions");
      const remove = el("button", "icon-mini danger");
      remove.type = "button";
      remove.setAttribute("aria-label", "取消收藏");
      remove.appendChild(makeIcon("trash"));
      remove.addEventListener("click", () => {
        state.tarot.favorites = state.tarot.favorites.filter((f) => f.id !== fav.id);
        persist();
        renderFavorites();
        renderTarot();
        showToast("已取消收藏", { icon: "star" });
      });
      actions.appendChild(remove);
      item.appendChild(actions);
      frag.appendChild(item);
    });
    dom.favList.replaceChildren(frag);
  }

  // 通话历史记录（已移动到「设置 → 数据管理」，渲染进 #callList）
  function renderCallHistory() {
    const calls = state.calls.slice().sort((a, b) => b.time - a.time);
    if (dom.callPageCount) dom.callPageCount.textContent = calls.length + " 次";
    if (dom.callHistorySub) dom.callHistorySub.textContent = calls.length ? calls.length + " 条记录" : "还没有记录";
    if (!dom.callList) return;
    if (!calls.length) {
      dom.callList.replaceChildren(buildEmptySlot("phone", "还没有通话记录", "在聊天里点开「通话」，接通后就能留下记录。"));
      return;
    }
    const frag = document.createDocumentFragment();
    calls.forEach((call) => {
      const item = el("div", "list-item");
      const main = el("div", "list-item-main");
      main.appendChild(el("b", "", call.connected ? "语音通话 " + formatDuration(call.duration) : "未接通的通话"));
      main.appendChild(el("small", "", formatDateTime(call.time) + " · " + activeChar().name));
      item.appendChild(main);
      frag.appendChild(item);
    });
    dom.callList.replaceChildren(frag);
  }

  /* =======================================================
     8.1 多梦角管理：切换 / 新增 / 编辑 / 删除
     ======================================================= */

  // 一张梦角卡片（我的页与梦角面板共用）
  function buildCharCard(char) {
    const isCurrent = char.id === state.activeId;
    const card = el("div", "char-card" + (isCurrent ? " is-current" : ""));

    const head = el("div", "char-card-head");
    const avatar = el("span", "avatar char-avatar");
    applyAvatar(avatar, char.name, char.avatar);
    head.appendChild(avatar);

    const copy = el("div", "char-card-copy");
    const nameLine = el("b");
    nameLine.appendChild(document.createTextNode(char.name));
    nameLine.appendChild(el("i", "hero-deco", char.deco || ""));
    copy.appendChild(nameLine);
    copy.appendChild(el("small", "", char.note || "还没有备注"));
    head.appendChild(copy);
    head.appendChild(el("span", "char-state", isCurrent ? "当前" : ""));
    card.appendChild(head);

    if (char.tags && char.tags.length) {
      const tags = el("div", "char-tags");
      char.tags.forEach((tag) => tags.appendChild(el("span", "tag-pill", tag)));
      card.appendChild(tags);
    }

    const actions = el("div", "char-card-actions");
    const switchBtn = el("button", "char-btn" + (isCurrent ? " is-on" : ""), isCurrent ? "使用中" : "切换");
    switchBtn.type = "button";
    switchBtn.disabled = isCurrent;
    switchBtn.addEventListener("click", () => switchChar(char.id));
    const editBtn = el("button", "char-btn", "编辑档案");
    editBtn.type = "button";
    editBtn.addEventListener("click", () => openCharEditor(char.id));
    const delBtn = el("button", "char-btn danger", "删除");
    delBtn.type = "button";
    delBtn.addEventListener("click", () => confirmDeleteChar(char));
    actions.appendChild(switchBtn);
    actions.appendChild(editBtn);
    actions.appendChild(delBtn);
    card.appendChild(actions);
    return card;
  }

  function openCharPanel() {
    renderCharPanel();
    ui.charPanelOpen = true;
    dom.charLayer.classList.add("open");
    dom.charLayer.setAttribute("aria-hidden", "false");
  }

  function closeCharPanel() {
    ui.charPanelOpen = false;
    dom.charLayer.classList.remove("open");
    dom.charLayer.setAttribute("aria-hidden", "true");
  }

  function renderCharPanel() {
    dom.charPanelList.replaceChildren();
    state.chars.forEach((char) => dom.charPanelList.appendChild(buildCharCard(char)));
    dom.charPanelTitle.textContent = "选择梦角 · " + state.chars.length + " 位";
  }

  // 切换当前梦角：清空运行期的会话状态，避免数据串台
  function switchChar(id) {
    const char = state.chars.find((item) => item.id === id);
    if (!char) return;
    if (char.id === state.activeId) {
      closeCharPanel();
      return;
    }
    cancelCurrentDelay();
    ui.replyQueue = [];
    ui.sessionVersion += 1;
    ui.typing = false;
    ui.quoteDraft = null;
    ui.mailEditingId = null;
    ui.annEditingId = null;
    ui.diaryEditingId = null;
    ui.calEditingId = null;
    ui.tarotFilter = false;
    // 切走之前先暂停音乐，并把进度写回「即将切走」的梦角
    stopMusicForCharSwitch();
    state.activeId = char.id;
    persist();
    refreshCharViews();
    closeCharPanel();
    showToast("已切换到「" + char.name + "」", { icon: "users" });
  }

  // 切换梦角后刷新所有可见界面（子页面会读取新梦角的独立数据）
  function refreshCharViews() {
    applyAppearance();
    renderHeader();
    renderMessages();
    renderHome();
    renderMine();
    renderSettingsTab();
    renderFavorites();
    renderAnniversary();
    renderTarot();
    renderCards();
    renderMoments();
    renderDiary();
    renderCalendar();
    renderStats();
    renderPlayer();
    renderPlaylist();
    if (dom.mailListView && !dom.mailListView.hidden) renderMail();
  }

  // 新增 / 编辑梦角档案
  function openCharEditor(id) {
    const isNew = !id;
    const char = isNew ? null : state.chars.find((item) => item.id === id);
    if (!isNew && !char) return;
    if (isNew && state.chars.length >= MAX_CHARS) {
      showToast("最多只能拥有 " + MAX_CHARS + " 位梦角", { icon: "users" });
      return;
    }

    const draft = {
      name: char ? char.name : nextCharName(),
      avatar: char ? char.avatar : "",
      note: char ? char.note : "",
      deco: char ? char.deco : CHAR_DECOS[0],
      heroBg: char ? char.heroBg : "",
      tags: char ? char.tags.join(" ") : "",
      quotes: char ? char.data.callQuotes.join("\n") : RANDOM_CALL_QUOTES.join("\n")
    };

    const body = el("div", "editor-body");

    /* 头像 */
    const avatarRow = el("div", "editor-avatar-row");
    const avatarPreview = el("span", "avatar char-avatar editor-avatar");
    applyAvatar(avatarPreview, draft.name, draft.avatar);
    avatarRow.appendChild(avatarPreview);
    const avatarBtns = el("div", "editor-avatar-btns");
    const avatarBtn = el("button", "ghost-btn", "上传头像");
    avatarBtn.type = "button";
    avatarBtn.addEventListener("click", () => {
      pickImage((dataUrl) => { draft.avatar = dataUrl; applyAvatar(avatarPreview, draft.name, dataUrl); });
    });
    const avatarClear = el("button", "ghost-btn", "移除");
    avatarClear.type = "button";
    avatarClear.addEventListener("click", () => { draft.avatar = ""; applyAvatar(avatarPreview, draft.name, ""); });
    avatarBtns.appendChild(avatarBtn);
    avatarBtns.appendChild(avatarClear);
    avatarRow.appendChild(avatarBtns);
    body.appendChild(avatarRow);

    /* 名称 */
    const nameField = el("label", "modal-field");
    nameField.appendChild(el("span", "", "角色名称（必填）"));
    const nameInput = el("input");
    nameInput.type = "text";
    nameInput.maxLength = 12;
    nameInput.value = draft.name;
    nameField.appendChild(nameInput);
    body.appendChild(nameField);

    /* 备注 */
    const noteField = el("label", "modal-field");
    noteField.appendChild(el("span", "", "个性备注"));
    const noteInput = el("input");
    noteInput.type = "text";
    noteInput.maxLength = 24;
    noteInput.value = draft.note;
    noteInput.placeholder = "例如：总是嘴硬心软";
    noteField.appendChild(noteInput);
    body.appendChild(noteField);

    /* 标签 */
    const tagField = el("label", "modal-field");
    tagField.appendChild(el("span", "", "专属标签（用空格分隔，最多 4 个）"));
    const tagInput = el("input");
    tagInput.type = "text";
    tagInput.value = draft.tags;
    tagInput.placeholder = "温柔 话少 治愈";
    tagField.appendChild(tagInput);
    body.appendChild(tagField);

    /* 装饰图案 */
    const decoField = el("div", "modal-field");
    decoField.appendChild(el("span", "", "名称后面的装饰图案"));
    const decoRow = el("div", "deco-row");
    CHAR_DECOS.forEach((deco) => {
      const btn = el("button", "deco-btn" + (deco === draft.deco ? " is-active" : ""), deco);
      btn.type = "button";
      btn.addEventListener("click", () => {
        draft.deco = deco;
        Array.from(decoRow.children).forEach((node) => node.classList.toggle("is-active", node === btn));
      });
      decoRow.appendChild(btn);
    });
    decoField.appendChild(decoRow);
    body.appendChild(decoField);

    /* 头图背景 */
    const bgField = el("div", "modal-field");
    bgField.appendChild(el("span", "", "主页头图背景（只属于这个梦角）"));
    const bgRow = el("div", "editor-avatar-row");
    const bgPreview = el("span", "editor-bg-preview");
    if (draft.heroBg) bgPreview.style.backgroundImage = 'url("' + draft.heroBg + '")';
    bgRow.appendChild(bgPreview);
    const bgBtns = el("div", "editor-avatar-btns");
    const bgBtn = el("button", "ghost-btn", "上传背景");
    bgBtn.type = "button";
    bgBtn.addEventListener("click", () => {
      pickImage((dataUrl) => {
        draft.heroBg = dataUrl;
        bgPreview.style.backgroundImage = 'url("' + dataUrl + '")';
      });
    });
    const bgClear = el("button", "ghost-btn", "移除");
    bgClear.type = "button";
    bgClear.addEventListener("click", () => { draft.heroBg = ""; bgPreview.style.backgroundImage = ""; });
    bgBtns.appendChild(bgBtn);
    bgBtns.appendChild(bgClear);
    bgRow.appendChild(bgBtns);
    bgField.appendChild(bgRow);
    body.appendChild(bgField);

    /* 通话台词 */
    const quoteField = el("label", "modal-field");
    quoteField.appendChild(el("span", "", "模拟通话台词（每行一句）"));
    const quoteInput = el("textarea");
    quoteInput.rows = 4;
    quoteInput.value = draft.quotes;
    quoteField.appendChild(quoteInput);
    body.appendChild(quoteField);

    openModal({
      icon: "users",
      title: isNew ? "新增梦角" : "编辑梦角档案",
      sub: isNew ? "新梦角默认是空白的，聊天、信箱、塔罗、纪念日都从零开始。" : "名称必填，其余内容随时可以再改。",
      body,
      confirmText: isNew ? "创建" : "保存",
      onConfirm: () => {
        const name = nameInput.value.trim();
        if (!name) {
          showToast("角色名称不能为空", { icon: "close" });
          nameInput.focus();
          return false;
        }
        const tags = tagInput.value.split(/[\s,，、]+/).map((t) => t.trim()).filter(Boolean).slice(0, 4);
        const quotes = quoteInput.value.split("\n").map((q) => q.trim()).filter(Boolean).slice(0, 40);
        if (isNew) {
          const created = {
            id: uid(),
            name: name.slice(0, 12),
            avatar: draft.avatar,
            note: noteInput.value.trim().slice(0, 24),
            tags,
            deco: draft.deco,
            heroBg: draft.heroBg,
            createdAt: Date.now(),
            data: defaultCharData(false)   // 新梦角：一套空白记录 + 初始字卡库
          };
          if (quotes.length) created.data.callQuotes = quotes;
          state.chars.push(created);
          persist();
          renderCharPanel();
          switchChar(created.id);
        } else {
          char.name = name.slice(0, 12);
          char.avatar = draft.avatar;
          char.note = noteInput.value.trim().slice(0, 24);
          char.tags = tags;
          char.deco = draft.deco;
          char.heroBg = draft.heroBg;
          char.data.callQuotes = quotes.length ? quotes : RANDOM_CALL_QUOTES.slice();
          persist();
          renderCharPanel();
          renderMine();
          renderSettingsTab();
          applyAppearance();
          renderHome();
          if (char.id === state.activeId) renderHeader();
        }
        showToast(isNew ? "新的梦角已经住进来了" : "档案已更新", { icon: "users" });
      }
    });
  }

  // 删除梦角（二次确认，提示会连带删除该梦角的全部独立数据）
  function confirmDeleteChar(char) {
    if (state.chars.length <= 1) {
      showToast("至少要保留一位梦角", { icon: "users" });
      return;
    }
    const data = char.data;
    const total = data.messages.length + data.mail.letters.length + data.tarot.records.length
      + data.anniversaries.length + data.moments.length + data.diary.length
      + data.calendar.length + data.calls.length;
    openConfirm({
      icon: "trash",
      title: "确定删除「" + char.name + "」吗？",
      sub: "该梦角专属的聊天记录、信箱信件、塔罗抽卡、纪念日、朋友圈、日记、日历与通话历史（共 " + total + " 条）会一并删除，且无法恢复。",
      confirmText: "删除",
      danger: true,
      onConfirm: () => {
        const wasActive = state.activeId === char.id;
        // 如果删的是当前梦角，先暂停音乐，并把进度写回「即将被删除的」梦角
        if (wasActive) stopMusicForCharSwitch();

        // 清理这个梦角歌单里的本地音频，避免 IndexedDB 里留下孤儿数据
        const tracks = char.data && char.data.music ? char.data.music.tracks : [];
        tracks.forEach((track) => {
          releaseTrackSource(track);
          if (track.storeKey) removeAudioBlob(track.storeKey);
        });

        state.chars = state.chars.filter((item) => item.id !== char.id);
        if (wasActive) {
          // 再切到剩下的第一位梦角
          state.activeId = state.chars[0].id;
          ui.sessionVersion += 1;
        }
        persist();
        renderCharPanel();
        refreshCharViews();
        showToast("已经删除「" + char.name + "」", { icon: "trash" });
      }
    });
  }

  /* =======================================================
     8.2 我的资料（用户名 / 头像 / 装饰图案）
     ======================================================= */
  function openUserEditor() {
    const user = currentUser();
    const draft = { name: user.name, avatar: user.avatar, deco: user.deco };
    const body = el("div", "editor-body");

    const row = el("div", "editor-avatar-row");
    const preview = el("span", "avatar user-avatar editor-avatar");
    applyAvatar(preview, draft.name, draft.avatar);
    row.appendChild(preview);
    const btns = el("div", "editor-avatar-btns");
    const up = el("button", "ghost-btn", "上传头像");
    up.type = "button";
    up.addEventListener("click", () => pickImage((dataUrl) => { draft.avatar = dataUrl; applyAvatar(preview, draft.name, dataUrl); }));
    const clear = el("button", "ghost-btn", "移除");
    clear.type = "button";
    clear.addEventListener("click", () => { draft.avatar = ""; applyAvatar(preview, draft.name, ""); });
    btns.appendChild(up);
    btns.appendChild(clear);
    row.appendChild(btns);
    body.appendChild(row);

    const nameField = el("label", "modal-field");
    nameField.appendChild(el("span", "", "昵称（必填）"));
    const nameInput = el("input");
    nameInput.type = "text";
    nameInput.maxLength = 12;
    nameInput.value = draft.name;
    nameField.appendChild(nameInput);
    body.appendChild(nameField);

    const decoField = el("div", "modal-field");
    decoField.appendChild(el("span", "", "名字后面的装饰图案"));
    const decoRow = el("div", "deco-row");
    CHAR_DECOS.forEach((deco) => {
      const btn = el("button", "deco-btn" + (deco === draft.deco ? " is-active" : ""), deco);
      btn.type = "button";
      btn.addEventListener("click", () => {
        draft.deco = deco;
        Array.from(decoRow.children).forEach((node) => node.classList.toggle("is-active", node === btn));
      });
      decoRow.appendChild(btn);
    });
    decoField.appendChild(decoRow);
    body.appendChild(decoField);

    openModal({
      icon: "user",
      title: "我的资料",
      sub: "会显示在主页头图的第一个头像与名字上。",
      body,
      confirmText: "保存",
      onConfirm: () => {
        const name = nameInput.value.trim();
        if (!name) {
          showToast("昵称不能为空", { icon: "close" });
          nameInput.focus();
          return false;
        }
        state.prefs.user = { name: name.slice(0, 12), avatar: draft.avatar, deco: draft.deco };
        persist();
        renderHome();
        renderMine();
        showToast("资料已更新", { icon: "user" });
      }
    });
  }

  /* =======================================================
     8.3 图片选择：文件 → 压缩 → 回调
     ======================================================= */
  let imagePickHandler = null;

  function pickImage(callback) {
    imagePickHandler = callback;
    const input = dom.avatarFileInput;
    if (!input) return;
    input.value = "";
    input.click();
  }

  function handlePickedFile(file, callback) {
    if (!file || !callback) return;
    if (file.size > MAX_IMAGE) {
      showToast("这张图片太大了，换一张小一点的吧", { icon: "close" });
      return;
    }
    if (typeof compressImage !== "function") return;
    compressImage(file).then((dataUrl) => callback(dataUrl)).catch(() => {
      showToast("图片读取失败，换一张试试", { icon: "close" });
    });
  }

  /* =======================================================
     8.4 外观设置页
     ======================================================= */
  function renderAppearance() {
    const look = state.prefs.appearance;
    Array.from(dom.appearanceThemeGroup.querySelectorAll(".seg-btn")).forEach((btn) => {
      const active = btn.dataset.themeValue === state.prefs.theme;
      btn.classList.toggle("is-active", active);
      btn.setAttribute("aria-checked", active ? "true" : "false");
    });

    Array.from(dom.bgGrid.querySelectorAll(".bg-slot")).forEach((slot) => {
      const key = slot.dataset.bg;
      const url = key === "heroBg" ? (activeChar().heroBg || look.heroBg) : look[key];
      const preview = slot.querySelector(".bg-preview");
      if (preview) preview.style.backgroundImage = url ? 'url("' + url + '")' : "";
      slot.classList.toggle("has-image", Boolean(url));
    });

    dom.alphaRange.value = String(clamp(numberOr(look.alpha, 100), 40, 100));
    dom.alphaLabel.textContent = clamp(numberOr(look.alpha, 100), 40, 100) + "%";
    dom.bubbleCssInput.value = look.bubbleCss || "";
    if (dom.appearanceSub) dom.appearanceSub.textContent = appearanceSummary();
  }

  // 写入某一种背景图（heroBg 属于当前梦角，其余属于全局外观）
  function setBackground(key, dataUrl) {
    if (key === "heroBg") {
      activeChar().heroBg = dataUrl || "";
    } else if (Object.prototype.hasOwnProperty.call(state.prefs.appearance, key)) {
      state.prefs.appearance[key] = dataUrl || "";
    }
    persist();
    applyAppearance();
    renderAppearance();
    renderHome();
    if (dom.appearanceSub) dom.appearanceSub.textContent = appearanceSummary();
    showToast(dataUrl ? "背景图已更新" : "背景图已移除", { icon: "image" });
  }

  // 背景槽位：上传 / 更换 / 移除
  function openBgPicker(key) {
    const labels = {
      pageBg: "页面背景",
      heroBg: "主页头图背景",
      annCardBg: "纪念日卡片背景",
      musicCardBg: "音乐卡片背景"
    };
    const look = state.prefs.appearance;
    const current = key === "heroBg" ? (activeChar().heroBg || look.heroBg) : look[key];

    const body = el("div", "editor-body");
    const preview = el("div", "bg-big-preview");
    if (current) preview.style.backgroundImage = 'url("' + current + '")';
    body.appendChild(preview);
    body.appendChild(el("p", "modal-sub", key === "heroBg"
      ? "这个背景只属于当前梦角「" + activeChar().name + "」。"
      : "这个背景属于全局外观，所有梦角共用。"));

    const actions = el("div", "compose-actions");
    const up = el("button", "small-primary", current ? "更换图片" : "上传图片");
    up.type = "button";
    up.addEventListener("click", () => {
      closeModal();
      pickImage((dataUrl) => setBackground(key, dataUrl));
    });
    actions.appendChild(up);
    if (current) {
      const rm = el("button", "ghost-btn", "移除背景");
      rm.type = "button";
      rm.addEventListener("click", () => { closeModal(); setBackground(key, ""); });
      actions.appendChild(rm);
    }
    body.appendChild(actions);

    openModal({
      icon: "image",
      title: labels[key] || "背景图",
      body,
      footer: false
    });
  }

  /* =======================================================
     8.5 朋友圈
     ======================================================= */
  function renderMoments() {
    const list = state.moments.slice().sort((a, b) => b.time - a.time);
    dom.momentCountLabel.textContent = list.length + " 条";
    if (!list.length) {
      dom.momentsList.replaceChildren(buildEmptySlot("world", "朋友圈还很安静", "发一条动态，或者点右上角让 TA 也发一条。"));
      return;
    }
    const frag = document.createDocumentFragment();
    list.forEach((moment) => {
      const isChar = moment.role === "char";
      const card = el("div", "moment-card" + (isChar ? " is-char" : ""));

      const head = el("div", "moment-head");
      const avatar = el("span", "avatar " + (isChar ? "char-avatar" : "user-avatar"));
      applyAvatar(avatar, isChar ? activeChar().name : currentUser().name, isChar ? activeChar().avatar : currentUser().avatar);
      head.appendChild(avatar);
      const copy = el("div", "moment-copy");
      const nameB = el("b");
      nameB.appendChild(document.createTextNode(isChar ? activeChar().name : currentUser().name));
      if (isChar) nameB.appendChild(el("i", "hero-deco", activeChar().deco || ""));
      copy.appendChild(nameB);
      copy.appendChild(el("small", "", formatDateTime(moment.time)));
      head.appendChild(copy);
      const del = el("button", "icon-mini danger");
      del.type = "button";
      del.setAttribute("aria-label", "删除这条动态");
      del.appendChild(makeIcon("trash"));
      del.addEventListener("click", () => {
        state.moments = state.moments.filter((item) => item.id !== moment.id);
        persist();
        renderMoments();
        renderHome();
        showToast("已删除这条动态", { icon: "trash" });
      });
      head.appendChild(del);
      card.appendChild(head);

      if (moment.text) card.appendChild(el("p", "moment-text", moment.text));
      if (moment.image) {
        const img = el("img", "moment-image");
        img.src = moment.image;
        img.alt = "配图";
        card.appendChild(img);
      }
      if (moment.source) {
        card.appendChild(el("small", "moment-source",
          moment.source.type === "card" ? "来自字卡 · " + moment.source.ref : "来自表情 · " + moment.source.ref));
      }

      const foot = el("div", "moment-foot");
      const like = el("button", "moment-like", "♡ " + moment.likes);
      like.type = "button";
      like.addEventListener("click", () => {
        moment.likes += 1;
        persist();
        renderMoments();
      });
      foot.appendChild(like);
      card.appendChild(foot);

      // 梦角自动留下的评论
      if (Array.isArray(moment.comments) && moment.comments.length) {
        const box = el("div", "moment-comments");
        moment.comments.forEach((comment) => {
          const line = el("p", "moment-comment");
          line.appendChild(el("b", "", (comment.role === "char" ? activeChar().name : currentUser().name) + "："));
          line.appendChild(document.createTextNode(comment.text));
          box.appendChild(line);
        });
        card.appendChild(box);
      }

      frag.appendChild(card);
    });
    dom.momentsList.replaceChildren(frag);
  }

  function updateMomentThumb() {
    const has = Boolean(ui.momentImage);
    dom.momentThumb.hidden = !has;
    if (has) dom.momentThumbImg.src = ui.momentImage;
  }

  function postMoment() {
    const text = dom.momentInput.value.trim();
    if (!text) {
      showToast("先写点什么再发布吧", { icon: "close" });
      dom.momentInput.focus();
      return;
    }
    const moment = {
      id: uid(),
      role: "me",
      text: text.slice(0, MAX_MOMENT),
      image: ui.momentImage || "",
      source: null,
      likes: 0,
      comments: [],
      time: Date.now()
    };
    state.moments.push(moment);
    dom.momentInput.value = "";
    ui.momentImage = "";
    updateMomentThumb();
    // 按「朋友圈互动概率」决定 TA 是否点赞 / 评论
    const reacted = maybeCharReactToMoment(moment);
    persist();
    renderMoments();
    renderHome();
    if (reacted) {
      showToast(
        activeChar().name + " 点赞了你的朋友圈" + (moment.comments.length ? "，还留了一句评论" : ""),
        { icon: "heart" }
      );
    } else {
      showToast("已经发布到朋友圈", { icon: "world" });
    }
  }

  // 梦角自动点赞 / 评论你的朋友圈（返回是否触发）
  function maybeCharReactToMoment(moment) {
    const chance = clamp(numberOr(state.settings.momentChance, 0), 0, 100);
    if (chance <= 0) return false;
    if (Math.random() * 100 >= chance) return false;
    moment.likes = Math.max(0, Number(moment.likes) || 0) + 1;
    if (Math.random() < 0.7) {
      const text = MOMENT_COMMENTS[Math.floor(Math.random() * MOMENT_COMMENTS.length)];
      if (!Array.isArray(moment.comments)) moment.comments = [];
      moment.comments.push({ id: uid(), role: "char", text, time: Date.now() });
    }
    return true;
  }

  // 让梦角从「字卡 / 表情」里挑一条发朋友圈
  function charPostMoment() {
    const body = el("div", "editor-body");
    body.appendChild(el("p", "modal-sub", "让「" + activeChar().name + "」从字卡或表情里挑一条发出去。"));

    const emojiWrap = el("div", "pick-emoji");
    EMOJIS.slice(0, 16).forEach((emoji) => {
      const btn = el("button", "pick-emoji-btn", emoji);
      btn.type = "button";
      btn.addEventListener("click", () => {
        closeModal();
        pushCharMoment(emoji, { type: "emoji", ref: emoji });
      });
      emojiWrap.appendChild(btn);
    });
    body.appendChild(emojiWrap);

    const cardWrap = el("div", "pick-card-list");
    const pool = (state.cards.length ? state.cards : DEFAULT_CARDS.map((text) => ({ upright: text, name: cardNameFromText(text) }))).slice(0, 40);
    pool.forEach((card) => {
      const text = cardLineText(card);
      const btn = el("button", "pick-card-item", text);
      btn.type = "button";
      btn.addEventListener("click", () => {
        closeModal();
        pushCharMoment(text, { type: "card", ref: text.slice(0, 60) });
      });
      cardWrap.appendChild(btn);
    });
    body.appendChild(cardWrap);

    openModal({ icon: "heart", title: "TA 想发一条", body, footer: false });
  }

  function pushCharMoment(text, source) {
    state.moments.push({
      id: uid(),
      role: "char",
      text: String(text || "").slice(0, MAX_MOMENT),
      image: "",
      source,
      likes: 0,
      comments: [],
      time: Date.now()
    });
    persist();
    renderMoments();
    renderHome();
    showToast(activeChar().name + " 发了一条朋友圈", { icon: "heart" });
  }

  /* =======================================================
     8.6 日记
     ======================================================= */
  function renderDiary() {
    const list = state.diary.slice().sort((a, b) => {
      if (a.date !== b.date) return a.date < b.date ? 1 : -1;
      return b.createdAt - a.createdAt;
    });
    dom.diaryCountLabel.textContent = list.length + " 篇";
    if (!list.length) {
      dom.diaryList.replaceChildren(buildEmptySlot("book", "还没有写过日记", "点右上角的「＋」，把今天的心情写下来。"));
      return;
    }
    const frag = document.createDocumentFragment();
    list.forEach((entry) => {
      const item = el("div", "list-item diary-item");
      const main = el("div", "list-item-main");
      const title = el("b");
      title.appendChild(document.createTextNode((entry.title || "无题")));
      title.appendChild(el("span", "mood-pill", entry.mood));
      main.appendChild(title);
      main.appendChild(el("small", "", formatDateLabel(entry.date) + " · 更新于 " + formatTime(entry.updatedAt)));
      main.appendChild(el("p", "", entry.body));
      item.appendChild(main);

      const actions = el("div", "list-item-actions");
      const edit = el("button", "icon-mini");
      edit.type = "button";
      edit.setAttribute("aria-label", "编辑日记");
      edit.appendChild(makeIcon("edit"));
      edit.addEventListener("click", () => openDiaryEditor(entry.id));
      const del = el("button", "icon-mini danger");
      del.type = "button";
      del.setAttribute("aria-label", "删除日记");
      del.appendChild(makeIcon("trash"));
      del.addEventListener("click", () => confirmDeleteDiary(entry));
      actions.appendChild(edit);
      actions.appendChild(del);
      item.appendChild(actions);
      frag.appendChild(item);
    });
    dom.diaryList.replaceChildren(frag);
  }

  function openDiaryEditor(id) {
    const entry = id ? state.diary.find((item) => item.id === id) : null;
    if (id && !entry) return;
    const body = el("div", "editor-body");

    const dateField = el("label", "modal-field");
    dateField.appendChild(el("span", "", "日期"));
    const dateInput = el("input");
    dateInput.type = "date";
    dateInput.value = entry ? entry.date : todayISO();
    dateField.appendChild(dateInput);
    body.appendChild(dateField);

    const titleField = el("label", "modal-field");
    titleField.appendChild(el("span", "", "标题"));
    const titleInput = el("input");
    titleInput.type = "text";
    titleInput.maxLength = 30;
    titleInput.value = entry ? entry.title : "";
    titleInput.placeholder = "例如：今天的晚风很好";
    titleField.appendChild(titleInput);
    body.appendChild(titleField);

    const moodField = el("div", "modal-field");
    moodField.appendChild(el("span", "", "心情"));
    const moodRow = el("div", "mood-row");
    let mood = entry ? entry.mood : DIARY_MOODS[0];
    DIARY_MOODS.forEach((item) => {
      const btn = el("button", "mood-btn" + (item === mood ? " is-active" : ""), item);
      btn.type = "button";
      btn.addEventListener("click", () => {
        mood = item;
        Array.from(moodRow.children).forEach((node) => node.classList.toggle("is-active", node === btn));
      });
      moodRow.appendChild(btn);
    });
    moodField.appendChild(moodRow);
    body.appendChild(moodField);

    const bodyField = el("label", "modal-field");
    bodyField.appendChild(el("span", "", "正文（必填）"));
    const bodyInput = el("textarea");
    bodyInput.rows = 6;
    bodyInput.maxLength = MAX_DIARY;
    bodyInput.value = entry ? entry.body : "";
    bodyInput.placeholder = "今天发生了什么…";
    bodyField.appendChild(bodyInput);
    body.appendChild(bodyField);

    openModal({
      icon: "book",
      title: entry ? "编辑日记" : "写一篇日记",
      sub: "只有你能看到这些文字。",
      body,
      confirmText: "保存",
      onConfirm: () => {
        const content = bodyInput.value.trim();
        if (!content) {
          showToast("日记正文不能为空", { icon: "close" });
          bodyInput.focus();
          return false;
        }
        const date = /^\d{4}-\d{2}-\d{2}$/.test(dateInput.value) ? dateInput.value : todayISO();
        if (entry) {
          entry.title = titleInput.value.trim().slice(0, 30);
          entry.body = content.slice(0, MAX_DIARY);
          entry.mood = mood;
          entry.date = date;
          entry.updatedAt = Date.now();
        } else {
          state.diary.push({
            id: uid(),
            title: titleInput.value.trim().slice(0, 30),
            body: content.slice(0, MAX_DIARY),
            mood,
            date,
            createdAt: Date.now(),
            updatedAt: Date.now()
          });
        }
        persist();
        renderDiary();
        renderMine();
        renderStats();
        showToast(entry ? "日记已更新" : "已经写进日记里", { icon: "book" });
      }
    });
  }

  function confirmDeleteDiary(entry) {
    openConfirm({
      icon: "trash",
      title: "删除这篇日记？",
      sub: "「" + (entry.title || formatDateLabel(entry.date)) + "」会被永久删除。",
      confirmText: "删除",
      danger: true,
      onConfirm: () => {
        state.diary = state.diary.filter((item) => item.id !== entry.id);
        persist();
        renderDiary();
        renderMine();
        renderStats();
        showToast("日记已删除", { icon: "trash" });
      }
    });
  }

  /* =======================================================
     8.7 日历（例假周期 / 重要事件 / 自定义）
     ======================================================= */
  function calTypeLabel(type) {
    const found = CAL_TYPES.find((item) => item.key === type);
    return found ? found.label : "自定义";
  }

  // 某一天是否被某条记录命中（支持起止日期）
  function dateHitsEvent(dateStr, event) {
    if (event.date === dateStr) return true;
    if (event.endDate && event.endDate > event.date) {
      return dateStr > event.date && dateStr <= event.endDate;
    }
    return false;
  }

  function renderCalendar() {
    const cursor = ui.calCursor;
    const year = cursor.getFullYear();
    const month = cursor.getMonth();
    dom.calMonth.textContent = year + " 年 " + (month + 1) + " 月";

    const startWeekday = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const today = todayISO();
    const events = state.calendar;

    dom.calGrid.replaceChildren();
    for (let blank = 0; blank < startWeekday; blank += 1) {
      dom.calGrid.appendChild(el("span", "cal-cell is-blank"));
    }
    for (let day = 1; day <= daysInMonth; day += 1) {
      const dateStr = year + "-" + pad2(month + 1) + "-" + pad2(day);
      const dayEvents = events.filter((event) => dateHitsEvent(dateStr, event));
      const cell = el("button", "cal-cell");
      cell.type = "button";
      cell.appendChild(el("b", "", String(day)));
      if (dayEvents.length) {
        const dots = el("span", "cal-dots");
        CAL_TYPES.forEach((type) => {
          if (dayEvents.some((event) => event.type === type.key)) dots.appendChild(el("i", "cal-dot dot-" + type.key));
        });
        cell.appendChild(dots);
      }
      if (dateStr === today) cell.classList.add("is-today");
      if (dateStr === ui.calSelected) cell.classList.add("is-selected");
      cell.addEventListener("click", () => {
        ui.calSelected = dateStr;
        renderCalendar();
      });
      dom.calGrid.appendChild(cell);
    }

    // 当天详情
    const selected = events
      .filter((event) => dateHitsEvent(ui.calSelected, event))
      .sort((a, b) => a.createdAt - b.createdAt);
    dom.calDayTitle.textContent = formatDateLabel(ui.calSelected);
    dom.calDayCount.textContent = selected.length + " 条";
    if (!selected.length) {
      dom.calDayList.replaceChildren(buildEmptySlot("calendar", "这一天还没有记录", "点右上角「＋」添加例假周期或重要事件。"));
      return;
    }
    const frag = document.createDocumentFragment();
    selected.forEach((event) => {
      const item = el("div", "list-item");
      const main = el("div", "list-item-main");
      const title = el("b");
      title.appendChild(document.createTextNode(event.title));
      title.appendChild(el("span", "cal-pill dot-" + event.type, calTypeLabel(event.type)));
      main.appendChild(title);
      if (event.note) main.appendChild(el("p", "", event.note));
      main.appendChild(el("small", "", event.endDate
        ? formatDateLabel(event.date) + " 至 " + formatDateLabel(event.endDate)
        : formatDateLabel(event.date)));
      item.appendChild(main);

      const actions = el("div", "list-item-actions");
      const edit = el("button", "icon-mini");
      edit.type = "button";
      edit.setAttribute("aria-label", "编辑记录");
      edit.appendChild(makeIcon("edit"));
      edit.addEventListener("click", () => openCalEditor(event.id));
      const del = el("button", "icon-mini danger");
      del.type = "button";
      del.setAttribute("aria-label", "删除记录");
      del.appendChild(makeIcon("trash"));
      del.addEventListener("click", () => {
        state.calendar = state.calendar.filter((node) => node.id !== event.id);
        persist();
        renderCalendar();
        renderMine();
        renderStats();
        showToast("记录已删除", { icon: "trash" });
      });
      actions.appendChild(edit);
      actions.appendChild(del);
      item.appendChild(actions);
      frag.appendChild(item);
    });
    dom.calDayList.replaceChildren(frag);
  }

  function openCalEditor(id) {
    const event = id ? state.calendar.find((item) => item.id === id) : null;
    if (id && !event) return;
    const body = el("div", "editor-body");

    const titleField = el("label", "modal-field");
    titleField.appendChild(el("span", "", "名称（必填）"));
    const titleInput = el("input");
    titleInput.type = "text";
    titleInput.maxLength = 24;
    titleInput.value = event ? event.title : "";
    titleInput.placeholder = "例如：经期第一天 / 见面";
    titleField.appendChild(titleInput);
    body.appendChild(titleField);

    let type = event ? event.type : "period";
    const typeField = el("div", "modal-field");
    typeField.appendChild(el("span", "", "类型"));
    const typeRow = el("div", "mood-row");
    CAL_TYPES.forEach((item) => {
      const btn = el("button", "mood-btn" + (item.key === type ? " is-active" : ""), item.label);
      btn.type = "button";
      btn.addEventListener("click", () => {
        type = item.key;
        Array.from(typeRow.children).forEach((node) => node.classList.toggle("is-active", node === btn));
      });
      typeRow.appendChild(btn);
    });
    typeField.appendChild(typeRow);
    body.appendChild(typeField);

    const dateField = el("label", "modal-field");
    dateField.appendChild(el("span", "", "开始日期"));
    const dateInput = el("input");
    dateInput.type = "date";
    dateInput.value = event ? event.date : ui.calSelected;
    dateField.appendChild(dateInput);
    body.appendChild(dateField);

    const endField = el("label", "modal-field");
    endField.appendChild(el("span", "", "结束日期（可选，适合例假周期）"));
    const endInput = el("input");
    endInput.type = "date";
    endInput.value = event && event.endDate ? event.endDate : "";
    endField.appendChild(endInput);
    body.appendChild(endField);

    const noteField = el("label", "modal-field");
    noteField.appendChild(el("span", "", "备注（可选）"));
    const noteInput = el("textarea");
    noteInput.rows = 3;
    noteInput.maxLength = 200;
    noteInput.value = event ? event.note : "";
    noteField.appendChild(noteInput);
    body.appendChild(noteField);

    openModal({
      icon: "calendar",
      title: event ? "编辑日历记录" : "新增日历记录",
      sub: "例假周期支持填写结束日期，日历上会用颜色标出来。",
      body,
      confirmText: "保存",
      onConfirm: () => {
        const title = titleInput.value.trim();
        if (!title) {
          showToast("名称不能为空", { icon: "close" });
          titleInput.focus();
          return false;
        }
        const date = /^\d{4}-\d{2}-\d{2}$/.test(dateInput.value) ? dateInput.value : ui.calSelected;
        let endDate = /^\d{4}-\d{2}-\d{2}$/.test(endInput.value) ? endInput.value : "";
        if (endDate && endDate < date) endDate = "";
        if (event) {
          event.title = title.slice(0, 24);
          event.type = type;
          event.date = date;
          event.endDate = endDate;
          event.note = noteInput.value.trim().slice(0, 200);
        } else {
          state.calendar.push({
            id: uid(),
            title: title.slice(0, 24),
            type,
            date,
            endDate,
            note: noteInput.value.trim().slice(0, 200),
            createdAt: Date.now()
          });
        }
        ui.calSelected = date;
        persist();
        renderCalendar();
        renderMine();
        renderStats();
        showToast(event ? "记录已更新" : "已经记录在日历上", { icon: "calendar" });
      }
    });
  }

  /* =======================================================
     8.8 消息统计
     ======================================================= */
  function renderStats() {
    const char = activeChar();
    dom.statsCharName.textContent = char.name;
    renderStatGrid(dom.statsGrid, char);

    dom.statsCharList.replaceChildren();
    state.chars.forEach((item) => {
      const data = item.data;
      const row = el("div", "list-item" + (item.id === state.activeId ? " is-current" : ""));
      const main = el("div", "list-item-main");
      main.appendChild(el("b", "", item.name + (item.id === state.activeId ? "（当前）" : "")));
      main.appendChild(el("small", "",
        "消息 " + data.messages.length +
        " · 信件 " + data.mail.letters.length +
        " · 塔罗 " + data.tarot.records.length +
        " · 纪念日 " + data.anniversaries.length +
        " · 朋友圈 " + data.moments.length +
        " · 日记 " + data.diary.length +
        " · 通话 " + data.calls.length));
      row.appendChild(main);
      if (item.id !== state.activeId) {
        const btn = el("button", "char-btn", "切换");
        btn.type = "button";
        btn.addEventListener("click", () => switchChar(item.id));
        const actions = el("div", "list-item-actions");
        actions.appendChild(btn);
        row.appendChild(actions);
      }
      dom.statsCharList.appendChild(row);
    });
  }

  /* =======================================================
     8.9 聊天记录 导入 / 导出
     ======================================================= */
  function exportChatRecords() {
    const char = activeChar();
    const payload = {
      app: "dream-card",
      kind: "chat-records",
      version: state.version,
      exportedAt: new Date().toISOString(),
      char: { name: char.name, note: char.note, tags: char.tags.slice() },
      messages: char.data.messages
    };
    try {
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      const now = new Date();
      link.href = url;
      link.download = "梦境漫游-" + char.name + "-聊天记录-" +
        now.getFullYear() + pad2(now.getMonth() + 1) + pad2(now.getDate()) + ".json";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(url), 2000);
      showToast("聊天记录已导出", { icon: "download" });
    } catch (error) {
      showToast("导出失败，浏览器可能不支持", { icon: "close" });
    }
  }

  function importChatRecords(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      let parsed = null;
      try {
        parsed = JSON.parse(String(reader.result || ""));
      } catch (error) {
        showToast("这个文件看起来不是聊天记录", { icon: "close" });
        return;
      }
      const rawMessages = Array.isArray(parsed)
        ? parsed
        : (parsed && Array.isArray(parsed.messages) ? parsed.messages : null);
      if (!rawMessages) {
        showToast("这个文件看起来不是聊天记录", { icon: "close" });
        return;
      }
      const messages = rawMessages.map(normalizeMessage).filter(Boolean);
      if (!messages.length) {
        showToast("文件里没有可导入的消息", { icon: "close" });
        return;
      }
      openConfirm({
        icon: "upload",
        title: "导入聊天记录",
        sub: "会把 " + messages.length + " 条消息追加到当前梦角「" + activeChar().name + "」的聊天里，原有消息不会被删除。",
        confirmText: "导入",
        onConfirm: () => {
          const merged = state.messages.concat(messages).sort((a, b) => a.time - b.time);
          state.messages = merged.slice(-3000);
          persist();
          renderMessages();
          renderHome();
          renderMine();
          renderStats();
          showToast("已导入 " + messages.length + " 条消息", { icon: "check" });
        }
      });
    };
    reader.readAsText(file);
  }

  /* =======================================================
     9. 聊天：头部与消息渲染
     ======================================================= */
  function messagePreview(message) {
    if (!message) return "";
    if (message.text) return message.text;
    if (message.kind === "image") return "图片";
    if (message.kind === "redpacket") return "红包";
    if (message.kind === "gift") return "礼物";
    return "一条消息";
  }

  function senderLabel(message) {
    if (message.role === "me") return state.settings.userName === "我" ? "你" : state.settings.userName;
    return state.settings.charName;
  }

  function isNearBottom() {
    return dom.chat.scrollHeight - dom.chat.scrollTop - dom.chat.clientHeight < 120;
  }

  function scrollToBottom(behavior) {
    dom.chat.scrollTo({ top: dom.chat.scrollHeight, behavior: behavior || "smooth" });
  }

  function updateScrollButton() {
    dom.scrollDown.hidden = dom.chat.scrollHeight - dom.chat.scrollTop - dom.chat.clientHeight <= 100;
  }

  function renderHeader() {
    const name = state.settings.charName;
    const char = activeChar();
    dom.charNameLabel.textContent = name;
    dom.chatSubtitle.textContent = ui.typing ? "正在翻字卡…" : "在字卡里等你 · 在线";
    dom.callName.textContent = name;
    dom.callMiniName.textContent = name;
    applyAvatar(dom.settingsAvatar, name, char.avatar);
    applyAvatar(dom.callAvatar, name, char.avatar);
    dom.cardCountLabel.textContent = state.cards.length;
    dom.settingsCardCount.textContent = state.cards.length + " 张字卡 · 编辑 / 导入 / 导出";
    if (dom.settingsCharCount) dom.settingsCharCount.textContent = "共 " + state.chars.length + " 位梦角 · 新增 / 编辑 / 删除";
    dom.moreBadge.hidden = state.cards.length > 0;
    if (dom.introPaperName) dom.introPaperName.textContent = name + " 的回信";
    if (dom.charNameInput) dom.charNameInput.value = name;
    document.title = name + " · 梦境漫游";
  }

  function buildAvatar(role) {
    const char = activeChar();
    const user = currentUser();
    const avatar = el("div", "avatar " + (role === "me" ? "user-avatar" : "char-avatar"));
    if (role === "me") applyAvatar(avatar, user.name, user.avatar);
    else applyAvatar(avatar, char.name, char.avatar);
    avatar.setAttribute("aria-hidden", "true");
    return avatar;
  }

  function buildDateDivider(timestamp) {
    const row = el("div", "date-divider");
    row.appendChild(el("span", "", formatDay(timestamp)));
    return row;
  }

  function systemIconName(text) {
    if (text.includes("撤回")) return "recall";
    if (text.includes("删除")) return "trash";
    if (text.includes("通话")) return "phone";
    if (text.includes("戳")) return "poke";
    if (text.includes("红包")) return "redpacket";
    return "sparkle";
  }

  function buildSystemRow(message) {
    const row = el("div", "system-row");
    row.dataset.id = message.id;
    const span = el("span");
    span.appendChild(makeIcon(systemIconName(message.text)));
    span.appendChild(document.createTextNode(message.text));
    row.appendChild(span);
    return row;
  }

  function buildQuote(quote) {
    const box = el("div", "quote-box");
    box.appendChild(el("b", "", "引用 " + quote.sender));
    box.appendChild(el("p", "", quote.snippet));
    return box;
  }

  function createDieFace(value) {
    const face = el("div", "die-face");
    face.setAttribute("aria-label", value + " 点");
    const layouts = { 1: [4], 2: [0, 8], 3: [0, 4, 8], 4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8] };
    const pips = layouts[value] || layouts[1];
    for (let i = 0; i < 9; i += 1) {
      const cell = el("span");
      if (pips.includes(i)) cell.appendChild(el("i", "die-pip"));
      face.appendChild(cell);
    }
    return face;
  }

  // 特殊消息内容（图片 / 语音 / 红包 / 骰子 / 位置 / 音乐 / 礼物 …）
  function buildSpecialContent(message) {
    const meta = message.meta || {};
    const charName = state.settings.charName;

    if (message.kind === "image") {
      const img = el("img");
      img.src = (message.meta && message.meta.src) || "";
      img.alt = message.text || "图片";
      return img;
    }

    if (message.kind === "voice") {
      const wrap = el("div", "voice-bubble");
      wrap.appendChild(makeIcon("play"));
      const waves = el("span", "voice-waves");
      for (let i = 0; i < 6; i += 1) waves.appendChild(el("i"));
      wrap.appendChild(waves);
      wrap.appendChild(el("span", "voice-duration", (message.meta && message.meta.duration ? message.meta.duration : 3) + "″"));
      return wrap;
    }

    if (message.kind === "redpacket") {
      const card = el("div", "redpacket-card");
      const top = el("div", "redpacket-top");
      const seal = el("span", "redpacket-seal");
      seal.appendChild(makeIcon("redpacket"));
      const copy = el("span", "redpacket-copy");
      copy.appendChild(el("strong", "", meta.blessing || "恭喜发财，大吉大利"));
      // 方向不同，文案不同（不再出现“微信红包”字样）
      copy.appendChild(el("span", "", message.role === "me" ? "送给 " + charName + " 的红包" : charName + " 发给你的红包"));
      top.appendChild(seal);
      top.appendChild(copy);
      const bottom = el("div", "redpacket-bottom");
      bottom.appendChild(el("span", "", message.role === "me" ? "给 " + charName : "来自 " + charName));
      bottom.appendChild(el("b", "", "¥ " + Number(meta.amount || 0).toFixed(2)));
      card.appendChild(top);
      card.appendChild(bottom);
      return card;
    }

    if (message.kind === "dice") {
      const card = el("div", "dice-card");
      card.appendChild(createDieFace(Number(meta.value) || 1));
      const copy = el("div", "die-copy");
      copy.appendChild(el("strong", "", "掷出了 " + (Number(meta.value) || 1) + " 点"));
      copy.appendChild(el("span", "", "骰子替你做的小小决定"));
      card.appendChild(copy);
      return card;
    }

    if (message.kind === "decision") {
      const card = el("div", "decision-card");
      const overline = el("div", "mini-overline");
      overline.appendChild(makeIcon("decide"));
      overline.appendChild(document.createTextNode("帮我抉择"));
      card.appendChild(overline);
      card.appendChild(el("strong", "", meta.choice || "让字卡替你选"));
      card.appendChild(el("small", "", meta.options ? "从 " + meta.options.length + " 个选项里选中" : "字卡已经替你选好了"));
      return card;
    }

    if (message.kind === "location") {
      const card = el("div", "location-card");
      const thumb = el("div", "location-thumb");
      thumb.appendChild(makeIcon("location"));
      const copy = el("div", "special-copy");
      copy.appendChild(el("strong", "", meta.place || "月光码头"));
      copy.appendChild(el("span", "", meta.detail || "一个很适合一起发呆的地方"));
      card.appendChild(thumb);
      card.appendChild(copy);
      return card;
    }

    if (message.kind === "music") {
      const card = el("div", "music-card");
      const art = el("div", "album-art");
      art.appendChild(makeIcon("music"));
      const copy = el("div", "special-copy");
      copy.appendChild(el("strong", "", "《" + (meta.title || "晚安") + "》"));
      copy.appendChild(el("span", "", (meta.artist || "") + " · " + (meta.note || "分享给你")));
      card.appendChild(art);
      card.appendChild(copy);
      return card;
    }

    if (message.kind === "gift") {
      const card = el("div", "gift-card");
      const art = el("div", "gift-art");
      art.appendChild(makeIcon("gift"));
      const copy = el("div", "special-copy");
      copy.appendChild(el("strong", "", meta.gift || "一份小礼物"));
      copy.appendChild(el("span", "", meta.line || "希望你喜欢"));
      card.appendChild(art);
      card.appendChild(copy);
      return card;
    }

    return el("p", "", message.text);
  }

  function buildMessageRow(message) {
    const row = el("div", "msg-row " + message.role);
    row.dataset.id = message.id;
    if (message.id === ui.newMessageId) row.classList.add("msg-new");

    row.appendChild(buildAvatar(message.role));

    const main = el("div", "msg-main");
    const wrap = el("div", "msg-bubble-wrap");
    const bubble = el("div", "bubble");
    bubble.dataset.id = message.id;
    bubble.setAttribute("data-message-id", message.id);

    if (message.quote) bubble.appendChild(buildQuote(message.quote));

    if (message.kind === "image") {
      bubble.classList.add("image-bubble");
      bubble.appendChild(buildSpecialContent(message));
    } else if (message.kind === "voice") {
      bubble.classList.add("voice-bubble-shell");
      bubble.dataset.duration = String((message.meta && message.meta.duration) || 3);
      bubble.appendChild(buildSpecialContent(message));
    } else if (["redpacket", "dice", "decision", "location", "music", "gift"].includes(message.kind)) {
      bubble.classList.add("special-bubble");
      bubble.appendChild(buildSpecialContent(message));
    } else {
      bubble.classList.add("text-bubble");
      bubble.appendChild(buildSpecialContent(message));
    }

    const more = el("button", "bubble-more");
    more.type = "button";
    more.setAttribute("aria-label", "消息操作");
    more.dataset.messageId = message.id;
    more.appendChild(makeIcon("more"));

    wrap.appendChild(bubble);
    wrap.appendChild(more);
    main.appendChild(wrap);

    const meta = el("div", "msg-meta");
    meta.appendChild(el("span", "msg-time", formatTime(message.time)));
    if (message.role === "char" && message.cardNo) meta.appendChild(el("span", "msg-card-tag", "字卡 " + pad2(message.cardNo)));
    main.appendChild(meta);
    row.appendChild(main);
    return row;
  }

  function buildTypingRow() {
    const row = el("div", "msg-row char typing-row");
    row.appendChild(buildAvatar("char"));
    const main = el("div", "msg-main");
    const wrap = el("div", "msg-bubble-wrap");
    const bubble = el("div", "bubble");
    bubble.appendChild(el("span", "typing-dot"));
    bubble.appendChild(el("span", "typing-dot"));
    bubble.appendChild(el("span", "typing-dot"));
    bubble.appendChild(el("span", "typing-label", "正在翻字卡"));
    wrap.appendChild(bubble);
    main.appendChild(wrap);
    row.appendChild(main);
    return row;
  }

  function buildEmptyChat() {
    const wrap = el("div", "empty-chat");
    const mark = el("div", "empty-chat-mark");
    mark.appendChild(makeIcon("card"));
    wrap.appendChild(mark);
    wrap.appendChild(el("b", "", "这一页还没有字迹"));
    wrap.appendChild(el("p", "", "发句话给 " + state.settings.charName + "，让字卡替 TA 回答你。"));
    return wrap;
  }

  function renderMessages(options) {
    const opts = options || {};
    const pinned = isNearBottom();
    const fragment = document.createDocumentFragment();
    let lastDay = "";

    if (!state.messages.length && !ui.typing) fragment.appendChild(buildEmptyChat());

    state.messages.forEach((message) => {
      const day = startOfDay(message.time);
      if (day !== lastDay) {
        fragment.appendChild(buildDateDivider(message.time));
        lastDay = day;
      }
      if (message.role === "system" || message.kind === "system") fragment.appendChild(buildSystemRow(message));
      else fragment.appendChild(buildMessageRow(message));
    });

    if (ui.typing) {
      if (!lastDay) fragment.appendChild(buildDateDivider(Date.now()));
      fragment.appendChild(buildTypingRow());
    }

    dom.messageList.replaceChildren(fragment);
    ui.newMessageId = null;

    requestAnimationFrame(() => {
      if (opts.forceScroll || pinned) dom.chat.scrollTop = dom.chat.scrollHeight;
      updateScrollButton();
    });
  }

  function setTyping(value) {
    if (ui.typing === value) return;
    ui.typing = value;
    renderHeader();
    renderMessages({ forceScroll: value });
  }

  function renderQuoteDraft() {
    if (!ui.quoteDraft) {
      dom.quoteDraft.hidden = true;
      return;
    }
    dom.quoteDraft.hidden = false;
    dom.quoteDraftName.textContent = ui.quoteDraft.sender;
    dom.quoteDraftText.textContent = ui.quoteDraft.snippet;
  }

  /* =======================================================
     10. 聊天设置面板
     ======================================================= */
  // 读取「最少 / 最多条数」，并保证 最多 ≥ 最少
  function readReplyRange() {
    let min = clamp(Math.round(numberOr(dom.replyMinInput.value, DEFAULT_SETTINGS.replyMin)), 1, MAX_REPLY_COUNT);
    let max = clamp(Math.round(numberOr(dom.replyMaxInput.value, DEFAULT_SETTINGS.replyMax)), 1, MAX_REPLY_COUNT);
    if (max < min) max = min;
    return { min, max };
  }

  function updateReplyModeHint() {
    const range = readReplyRange();
    if (range.min === range.max) {
      dom.replyModeHint.textContent = range.min <= 1
        ? "每次只发来一条，像一句轻轻的话"
        : "每次固定 " + range.min + " 条，一条一条说给你听";
      return;
    }
    dom.replyModeHint.textContent = "每次 " + range.min + " – " + range.max + " 条"
      + (range.max > 1 ? "，像连发的短句" : "");
  }

  // 步进器：每次加减都保证区间合法
  function nudgeReplyRange(field, delta) {
    const range = readReplyRange();
    if (field === "min") {
      range.min = clamp(range.min + delta, 1, MAX_REPLY_COUNT);
      if (range.min > range.max) range.max = range.min;
    } else {
      range.max = clamp(range.max + delta, 1, MAX_REPLY_COUNT);
      if (range.max < range.min) range.min = range.max;
    }
    dom.replyMinInput.value = range.min;
    dom.replyMaxInput.value = range.max;
    updateReplyModeHint();
  }

  function updateDelayPreview() {
    const min = Math.max(1, numberOr(dom.minSecondsInput.value, 3));
    const max = Math.max(1, numberOr(dom.maxSecondsInput.value, 15));
    if (max < min) {
      dom.delayPreview.textContent = "最多延迟需要大于最少延迟";
      dom.delayPreview.classList.add("invalid");
      return;
    }
    dom.delayPreview.classList.remove("invalid");
    dom.delayPreview.textContent = "TA 将在 " + formatDelay(min) + " – " + formatDelay(max) + " 内回应你";
  }

  // —— 开关按钮 ——
  function isSwitchOn(node) {
    return Boolean(node) && node.getAttribute("aria-checked") === "true";
  }

  function setSwitch(node, on) {
    if (!node) return;
    node.setAttribute("aria-checked", on ? "true" : "false");
  }

  // 关闭时把间隔输入框置灰，避免误改
  function updateProactiveFields() {
    const msgOn = isSwitchOn(dom.proactiveMsgToggle);
    const mailOn = isSwitchOn(dom.proactiveMailToggle);
    dom.proactiveMsgSection.classList.toggle("is-off", !msgOn);
    dom.proactiveMailSection.classList.toggle("is-off", !mailOn);
    dom.proactiveMsgMinInput.disabled = !msgOn;
    dom.proactiveMsgMaxInput.disabled = !msgOn;
    dom.proactiveMailMinInput.disabled = !mailOn;
    dom.proactiveMailMaxInput.disabled = !mailOn;
  }

  function populateSettings() {
    const settings = state.settings;
    applyAvatar(dom.settingsAvatar, settings.charName, activeChar().avatar);
    dom.charNameInput.value = settings.charName;
    dom.userNameInput.value = state.prefs.user.name;
    dom.replyMinInput.value = settings.replyMin;
    dom.replyMaxInput.value = settings.replyMax;
    dom.minSecondsInput.value = settings.delayMinSeconds;
    dom.maxSecondsInput.value = settings.delayMaxSeconds;
    dom.proactiveMsgMinInput.value = settings.proactiveMessage.minMinutes;
    dom.proactiveMsgMaxInput.value = settings.proactiveMessage.maxMinutes;
    dom.proactiveMailMinInput.value = settings.proactiveLetter.minHours;
    dom.proactiveMailMaxInput.value = settings.proactiveLetter.maxHours;
    dom.momentChanceInput.value = settings.momentChance;
    setSwitch(dom.proactiveMsgToggle, settings.proactiveMessage.on);
    setSwitch(dom.proactiveMailToggle, settings.proactiveLetter.on);
    updateProactiveFields();
    updateReplyModeHint();
    updateDelayPreview();
    dom.settingsCardCount.textContent = state.cards.length + " 张字卡 · 编辑 / 导入 / 导出";
    if (dom.settingsCharCount) dom.settingsCharCount.textContent = "共 " + state.chars.length + " 位梦角 · 新增 / 编辑 / 删除";
  }

  function openSettings() {
    closePanels();
    populateSettings();
    dom.settingsLayer.classList.add("open");
    dom.settingsLayer.setAttribute("aria-hidden", "false");
  }

  function closeSettings() {
    dom.settingsLayer.classList.remove("open");
    dom.settingsLayer.setAttribute("aria-hidden", "true");
  }

  function saveSettings() {
    const charName = dom.charNameInput.value.trim().slice(0, 12);
    const userName = dom.userNameInput.value.trim().slice(0, 12);
    if (!charName) {
      showToast("先给 TA 起一个名字吧", { icon: "heart" });
      dom.charNameInput.focus();
      return;
    }
    let delayMin = clamp(Math.round(numberOr(dom.minSecondsInput.value, 3)), 1, 600);
    let delayMax = clamp(Math.round(numberOr(dom.maxSecondsInput.value, 15)), 1, 600);
    if (delayMax < delayMin) delayMax = delayMin;

    let msgMin = clamp(Math.round(numberOr(dom.proactiveMsgMinInput.value, 30)), 1, 1440);
    let msgMax = clamp(Math.round(numberOr(dom.proactiveMsgMaxInput.value, 120)), 1, 1440);
    if (msgMax < msgMin) msgMax = msgMin;

    let mailMin = clamp(Math.round(numberOr(dom.proactiveMailMinInput.value, 6)), 1, 720);
    let mailMax = clamp(Math.round(numberOr(dom.proactiveMailMaxInput.value, 24)), 1, 720);
    if (mailMax < mailMin) mailMax = mailMin;

    // 最少 / 最多条数
    const replyRange = readReplyRange();

    // 角色名写入「当前梦角档案」，其余是全局聊天偏好
    activeChar().name = charName;
    state.settings = {
      charName,
      userName: userName || "我",
      replyMin: replyRange.min,
      replyMax: replyRange.max,
      delayMinSeconds: delayMin,
      delayMaxSeconds: delayMax,
      proactiveMessage: {
        on: isSwitchOn(dom.proactiveMsgToggle),
        minMinutes: msgMin,
        maxMinutes: msgMax
      },
      proactiveLetter: {
        on: isSwitchOn(dom.proactiveMailToggle),
        minHours: mailMin,
        maxHours: mailMax
      },
      momentChance: clamp(Math.round(numberOr(dom.momentChanceInput.value, 60)), 0, 100)
    };
    // state.settings 被整体替换过，重新接管角色名代理
    attachCharProxies(state);
    state.prefs.user.name = userName || "我";
    persist();
    renderHeader();
    renderMessages();
    renderHome();
    renderMine();
    renderSettingsTab();
    closeSettings();
    // 主动消息 / 主动来信按新间隔重新排期（关闭时会自动停掉）
    restartProactiveTimers();
    showToast("聊天设置已保存", { icon: "check" });
  }

  /* =======================================================
     11. 字卡库
     ======================================================= */
  function syncCardCounts() {
    dom.cardCountLabel.textContent = state.cards.length;
    dom.settingsCardCount.textContent = state.cards.length + " 张字卡 · 编辑 / 导入 / 导出";
    dom.moreBadge.hidden = state.cards.length > 0;
  }

  /* ---------- 分类与筛选的小工具 ---------- */

  // 按 id 找分类；空 id / 已删除都返回 null（视为未分类）
  function findCategory(id) {
    if (!id) return null;
    return state.cardCategories.find((cat) => cat.id === id) || null;
  }

  function categoryNameOf(id) {
    const cat = findCategory(id);
    return cat ? cat.name : "未分类";
  }

  // 某个分类下的字卡数量
  function countCardsInCategory(id) {
    if (id === "none") return state.cards.filter((card) => !findCategory(card.categoryId)).length;
    if (!id || id === "all") return state.cards.length;
    return state.cards.filter((card) => card.categoryId === id).length;
  }

  // 取某个筛选条件下的字卡（"all" / "none" / 分类 id）
  function cardsInFilter(filter) {
    if (filter === "none") return state.cards.filter((card) => !findCategory(card.categoryId));
    if (filter && filter !== "all") return state.cards.filter((card) => card.categoryId === filter);
    return state.cards;
  }

  // 渲染横向分类标签栏
  function renderCatBar() {
    const noCategory = state.cardCategories.length === 0;
    dom.catGuide.hidden = !noCategory;
    dom.catBar.hidden = noCategory;
    if (noCategory) {
      dom.catBar.replaceChildren();
      return;
    }

    const frag = document.createDocumentFragment();
    const chips = [{ value: "all", label: "全部", count: state.cards.length }];
    state.cardCategories.forEach((cat) => {
      chips.push({ value: cat.id, label: cat.name, count: countCardsInCategory(cat.id) });
    });
    // 「未分类」只在真的有未分类字卡时出现
    const uncategorized = countCardsInCategory("none");
    if (uncategorized > 0) chips.push({ value: "none", label: "未分类", count: uncategorized });

    chips.forEach((item) => {
      const chip = el("button", "cat-chip" + (ui.cardFilter === item.value ? " is-active" : ""));
      chip.type = "button";
      chip.dataset.cat = item.value;
      chip.appendChild(el("span", "", item.label));
      chip.appendChild(el("em", "", item.count));
      frag.appendChild(chip);
    });

    const add = el("button", "cat-chip cat-chip-add", "＋ 分类");
    add.type = "button";
    add.dataset.cat = "add";
    frag.appendChild(add);
    dom.catBar.replaceChildren(frag);
  }

  // 列表空状态（区分「搜不到」「分类为空」「整库为空」）
  function buildCardsEmpty(query) {
    const wrap = el("div", "empty-cards");
    const mark = el("div", "empty-mark");
    mark.appendChild(makeIcon("card"));
    wrap.appendChild(mark);

    const filterName = ui.cardFilter === "none" ? "未分类" : (findCategory(ui.cardFilter) ? categoryNameOf(ui.cardFilter) : "");
    let title = "字卡库还是空的";
    let hint = "写下一张字卡，它会在聊天和抽卡时出现。";
    if (query) {
      title = "没有找到这张字卡";
      hint = "换一个关键词，或者写一张新的吧。";
    } else if (ui.cardFilter !== "all") {
      title = "「" + filterName + "」里还没有字卡";
      hint = "点下面的按钮，写一张收进这个分类。";
    }
    wrap.appendChild(el("b", "", title));
    wrap.appendChild(el("p", "", hint));

    const actions = el("div", "empty-actions");
    const add = el("button", "small-primary", "＋ 新增字卡");
    add.type = "button";
    add.addEventListener("click", () => openCardForm(null));
    actions.appendChild(add);
    if (query) {
      const clear = el("button", "text-btn", "清空搜索");
      clear.type = "button";
      clear.addEventListener("click", () => {
        dom.cardSearch.value = "";
        ui.cardQuery = "";
        renderCards();
      });
      actions.appendChild(clear);
    }
    wrap.appendChild(actions);
    return wrap;
  }

  function renderCards() {
    // 分类被删除后，筛选自动回到「全部」
    if (ui.cardFilter !== "all" && ui.cardFilter !== "none" && !findCategory(ui.cardFilter)) {
      ui.cardFilter = "all";
    }
    renderCatBar();

    const query = ui.cardQuery.trim().toLowerCase();
    const items = cardsInFilter(ui.cardFilter).filter((card) => {
      if (!query) return true;
      return [card.name, card.upright, card.note]
        .some((text) => String(text || "").toLowerCase().includes(query));
    });

    dom.cardCountLabel.textContent = state.cards.length;
    dom.visibleCardCount.textContent = items.length + " 张";

    if (!items.length) {
      dom.cardList.replaceChildren(buildCardsEmpty(query));
      return;
    }

    const fragment = document.createDocumentFragment();
    items.forEach((card) => {
      const index = state.cards.indexOf(card);
      const article = el("article", "word-card");
      article.dataset.id = card.id;
      article.appendChild(el("span", "card-number", pad2(index + 1)));

      const copy = el("div", "card-copy");
      const titleRow = el("div", "card-title-row");
      titleRow.appendChild(el("b", "card-name", card.name));
      titleRow.appendChild(el("span", "card-cat-tag" + (card.categoryId ? "" : " is-none"), categoryNameOf(card.categoryId)));
      copy.appendChild(titleRow);
      copy.appendChild(el("p", "", card.upright || "还没有写字卡内容"));

      const meta = [];
      if (card.note) meta.push(card.note);
      meta.push("共 " + (card.upright || "").length + " 字");
      copy.appendChild(el("small", "", meta.join(" · ")));
      article.appendChild(copy);

      const actions = el("div", "card-actions");
      const edit = el("button");
      edit.type = "button";
      edit.dataset.action = "edit";
      edit.dataset.id = card.id;
      edit.setAttribute("aria-label", "编辑字卡");
      edit.appendChild(makeIcon("edit"));
      const del = el("button");
      del.type = "button";
      del.dataset.action = "delete";
      del.dataset.id = card.id;
      del.setAttribute("aria-label", "删除字卡");
      del.appendChild(makeIcon("trash"));
      actions.appendChild(edit);
      actions.appendChild(del);
      article.appendChild(actions);
      fragment.appendChild(article);
    });
    dom.cardList.replaceChildren(fragment);
  }

  /* ---------- 新增 / 编辑字卡（弹窗表单） ---------- */
  function openCardForm(id) {
    const card = id ? state.cards.find((item) => item.id === id) : null;
    if (id && !card) return;
    // 当前正停留在某个分类时，新增字卡默认收进这个分类
    const presetCategory = findCategory(ui.cardFilter) ? ui.cardFilter : "";

    const wrapper = el("div", "card-form");
    const options = [""].concat(state.cardCategories.map((cat) => cat.id));
    // 表单只保留三项：所属分类、字卡内容、备注。
    // 牌名不再让用户填写，保存时由「字卡内容」自动生成短标题。
    wrapper.innerHTML =
      '<label class="modal-field"><span>所属分类</span>' +
      '<select id="cardCatField">' +
      options.map((cid) => '<option value="' + esc(cid) + '">' + esc(cid ? categoryNameOf(cid) : "未分类") + "</option>").join("") +
      "</select></label>" +
      '<label class="modal-field"><span>字卡内容</span>' +
      '<textarea id="cardContentField" rows="3" maxlength="' + MAX_CARD_TEXT + '" placeholder="写下这张字卡想说的话"></textarea></label>' +
      '<label class="modal-field"><span>备注</span>' +
      '<input id="cardNoteField" type="text" maxlength="' + MAX_CARD_NOTE + '" placeholder="只给自己看的小提示（可留空）"></label>' +
      '<p class="form-hint">字卡内容会出现在聊天、抽卡和主动消息里。Ctrl / ⌘ + Enter 也可以保存。</p>' +
      '<div class="modal-actions">' +
      '<button class="cancel" type="button" data-act="cancel">取消</button>' +
      '<button class="confirm" type="button" data-act="save">保存</button>' +
      "</div>";

    openModal({
      icon: "card",
      title: card ? "编辑字卡" : "新增字卡",
      sub: card ? "改好以后，它会继续出现在聊天和抽卡里" : "一张字卡，就是一句可以被抽到的传讯",
      body: wrapper,
      footer: false
    });

    const catField = wrapper.querySelector("#cardCatField");
    const contentField = wrapper.querySelector("#cardContentField");
    const noteField = wrapper.querySelector("#cardNoteField");

    catField.value = card ? (findCategory(card.categoryId) ? card.categoryId : "") : presetCategory;
    contentField.value = card ? card.upright : "";
    noteField.value = card ? card.note : "";

    const save = () => {
      const content = contentField.value.trim().slice(0, MAX_CARD_TEXT);
      if (!content) {
        showToast("字卡内容不能为空", { icon: "close" });
        contentField.focus();
        return;
      }
      if (!card && state.cards.length >= MAX_CARDS) {
        showToast("字卡库最多保存 " + MAX_CARDS + " 张", { icon: "card" });
        return;
      }

      // 牌名规则：新卡按内容生成；老卡内容没改就保留原题；
      // 内置塔罗带 roman，永远保留原牌名（如「愚者」）。
      let name;
      if (!card) {
        name = cardNameFromText(content);
      } else if (card.roman) {
        name = card.name || cardNameFromText(content);
      } else if (content !== card.upright) {
        name = cardNameFromText(content);
      } else {
        name = card.name || cardNameFromText(content);
      }

      const payload = {
        name,
        upright: content,
        // 新增字卡不再写逆位；编辑时保留老数据（内置塔罗的逆位释义不会被清掉）
        reversed: card ? (card.reversed || "") : "",
        note: noteField.value.trim().slice(0, MAX_CARD_NOTE),
        categoryId: findCategory(catField.value) ? catField.value : ""
      };
      if (card) {
        Object.assign(card, payload);
      } else {
        state.cards.unshift(Object.assign({ id: uid(), roman: "", createdAt: Date.now() }, payload));
      }
      persist();
      closeModal();

      // 保存后如果当前筛选看不到它，就切到「全部」，避免“保存了却找不到”
      const matchesFilter = ui.cardFilter === "all" ||
        (ui.cardFilter === "none" ? !payload.categoryId : ui.cardFilter === payload.categoryId);
      if (!matchesFilter) ui.cardFilter = payload.categoryId || "all";

      renderCards();
      syncCardCounts();
      renderHome();
      renderTarot();
      showToast(card ? "字卡已修改" : "新的字卡已收进库中", { icon: card ? "check" : "sparkle" });
    };

    wrapper.querySelector('[data-act="cancel"]').addEventListener("click", closeModal);
    wrapper.querySelector('[data-act="save"]').addEventListener("click", save);
    wrapper.addEventListener("keydown", (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
        event.preventDefault();
        save();
      }
    });
    setTimeout(() => contentField.focus(), 60);
  }

  /* ---------- 分类管理（增 / 改 / 删） ---------- */
  function openCategoryManager() {
    const wrapper = el("div", "cat-manager");
    const list = el("div", "cat-manager-list");

    if (!state.cardCategories.length) {
      list.appendChild(el("p", "cat-manager-empty", "还没有分类。建一个分类，把字卡按主题收好。"));
    }
    state.cardCategories.forEach((cat) => {
      const row = el("div", "cat-manager-row");
      const copy = el("div", "cat-manager-copy");
      copy.appendChild(el("b", "", cat.name));
      copy.appendChild(el("small", "", countCardsInCategory(cat.id) + " 张字卡"));
      row.appendChild(copy);

      const edit = el("button", "icon-mini");
      edit.type = "button";
      edit.setAttribute("aria-label", "重命名分类");
      edit.appendChild(makeIcon("edit"));
      edit.addEventListener("click", () => openCategoryForm(cat.id, true));
      row.appendChild(edit);

      const del = el("button", "icon-mini danger");
      del.type = "button";
      del.setAttribute("aria-label", "删除分类");
      del.appendChild(makeIcon("trash"));
      del.addEventListener("click", () => confirmDeleteCategory(cat.id));
      row.appendChild(del);

      list.appendChild(row);
    });
    wrapper.appendChild(list);

    const add = el("button", "small-primary cat-manager-add", "＋ 新增分类");
    add.type = "button";
    add.addEventListener("click", () => {
      if (state.cardCategories.length >= MAX_CATEGORIES) {
        showToast("最多只能建 " + MAX_CATEGORIES + " 个分类", { icon: "folder" });
        return;
      }
      openCategoryForm(null, true);
    });
    wrapper.appendChild(add);

    const done = el("button", "text-btn cat-manager-done", "完成");
    done.type = "button";
    done.addEventListener("click", closeModal);
    wrapper.appendChild(done);

    openModal({
      icon: "folder",
      title: "字卡分类",
      sub: "分类跟随当前梦角独立保存，切换梦角互不影响",
      body: wrapper,
      footer: false
    });
  }

  function openCategoryForm(id, fromManager) {
    const cat = id ? findCategory(id) : null;
    if (id && !cat) return;

    const wrapper = el("div", "cat-form");
    wrapper.innerHTML =
      '<label class="modal-field"><span>分类名称</span>' +
      '<input id="catNameField" type="text" maxlength="' + MAX_CATEGORY_NAME + '" placeholder="例如：大阿尔卡纳 / 日常心语 / 角色专属传讯"></label>' +
      '<p class="form-hint">分类只用于归类和限定抽卡范围，不会改动已有字卡内容。</p>' +
      '<div class="modal-actions">' +
      '<button class="cancel" type="button" data-act="cancel">取消</button>' +
      '<button class="confirm" type="button" data-act="save">保存</button>' +
      "</div>";

    openModal({
      icon: "folder",
      title: cat ? "编辑分类" : "新增分类",
      body: wrapper,
      footer: false
    });

    const field = wrapper.querySelector("#catNameField");
    field.value = cat ? cat.name : "";

    const back = () => {
      if (fromManager) openCategoryManager();
      else closeModal();
    };

    const save = () => {
      const name = field.value.trim().slice(0, MAX_CATEGORY_NAME);
      if (!name) {
        showToast("分类名称不能为空", { icon: "close" });
        field.focus();
        return;
      }
      const duplicated = state.cardCategories.some((item) => item.name === name && (!cat || item.id !== cat.id));
      if (duplicated) {
        showToast("已经有同名分类了", { icon: "close" });
        field.focus();
        return;
      }
      if (cat) {
        cat.name = name;
      } else {
        if (state.cardCategories.length >= MAX_CATEGORIES) {
          showToast("最多只能建 " + MAX_CATEGORIES + " 个分类", { icon: "folder" });
          return;
        }
        state.cardCategories.push({ id: uid(), name, createdAt: Date.now() });
      }
      persist();
      renderCards();
      renderTarot();
      showToast(cat ? "分类已更新" : "分类已创建", { icon: "check" });
      back();
    };

    wrapper.querySelector('[data-act="cancel"]').addEventListener("click", back);
    wrapper.querySelector('[data-act="save"]').addEventListener("click", save);
    wrapper.addEventListener("keydown", (event) => {
      if (event.key === "Enter" && !event.isComposing) {
        event.preventDefault();
        save();
      }
    });
    setTimeout(() => field.focus(), 60);
  }

  // 删除分类的二次确认：① 字卡移到未分类 ② 连同字卡一起删除
  function confirmDeleteCategory(id) {
    const cat = findCategory(id);
    if (!cat) return;
    const count = countCardsInCategory(cat.id);
    const wrapper = el("div", "cat-delete");
    wrapper.appendChild(el("p", "cat-delete-text", count
      ? "「" + cat.name + "」下有 " + count + " 张字卡，删除分类时想怎么处理？"
      : "「" + cat.name + "」下还没有字卡，可以放心删除。"));
    wrapper.appendChild(el("p", "form-hint", "这个操作只影响当前梦角的字卡库。"));

    const removeCategory = (wipeCards) => {
      state.cardCategories = state.cardCategories.filter((item) => item.id !== cat.id);
      if (wipeCards) {
        state.cards = state.cards.filter((card) => card.categoryId !== cat.id);
      } else {
        state.cards.forEach((card) => {
          if (card.categoryId === cat.id) card.categoryId = "";
        });
      }
      if (ui.cardFilter === cat.id) ui.cardFilter = "all";
      if (ui.tarotScope === cat.id) ui.tarotScope = "all";
      persist();
      renderCards();
      syncCardCounts();
      renderTarot();
      renderHome();
      showToast(wipeCards ? "分类和分类下的字卡已删除" : "分类已删除，字卡移到了未分类", { icon: "trash" });
      openCategoryManager();
    };

    if (count) {
      const keep = el("button", "cat-delete-option");
      keep.type = "button";
      keep.innerHTML = "<b>只删除分类</b><small>分类下的 " + count + " 张字卡移到「未分类」，内容保留</small>";
      keep.addEventListener("click", () => removeCategory(false));
      wrapper.appendChild(keep);

      const wipe = el("button", "cat-delete-option is-danger");
      wipe.type = "button";
      wipe.innerHTML = "<b>连同字卡一起删除</b><small>「" + esc(cat.name) + "」下的 " + count + " 张字卡会一起消失</small>";
      wipe.addEventListener("click", () => removeCategory(true));
      wrapper.appendChild(wipe);
    } else {
      const only = el("button", "cat-delete-option is-danger");
      only.type = "button";
      only.innerHTML = "<b>删除这个分类</b><small>当前分类下没有字卡，不会删除任何内容</small>";
      only.addEventListener("click", () => removeCategory(false));
      wrapper.appendChild(only);
    }

    const cancel = el("button", "text-btn cat-delete-cancel", "取消");
    cancel.type = "button";
    cancel.addEventListener("click", openCategoryManager);
    wrapper.appendChild(cancel);

    openModal({ icon: "trash", title: "删除分类", body: wrapper, footer: false });
  }

  function deleteCard(id) {
    const index = state.cards.findIndex((card) => card.id === id);
    if (index < 0) return;
    const removed = state.cards.splice(index, 1)[0];
    persist();
    renderCards();
    syncCardCounts();
    renderHome();
    showToast("已删除「" + removed.name + "」", {
      icon: "trash",
      actionLabel: "撤销",
      duration: 3600,
      onAction: () => {
        state.cards.splice(Math.min(index, state.cards.length), 0, removed);
        persist();
        renderCards();
        syncCardCounts();
        renderHome();
        showToast("字卡已恢复", { icon: "check" });
      }
    });
  }

  // 把导入文件里的单条记录整理成统一结构
  function normalizeImportedCardShape(item) {
    if (typeof item === "string") {
      const text = item.trim();
      return text ? { upright: text } : null;
    }
    if (!item || typeof item !== "object") return null;
    const upright = typeof item.upright === "string" ? item.upright
      : typeof item.text === "string" ? item.text
        : typeof item.content === "string" ? item.content : "";
    const name = typeof item.name === "string" ? item.name : "";
    if (!upright.trim() && !name.trim()) return null;
    return {
      name,
      upright,
      reversed: typeof item.reversed === "string" ? item.reversed : (typeof item.rev === "string" ? item.rev : ""),
      note: typeof item.note === "string" ? item.note : "",
      categoryId: typeof item.categoryId === "string" ? item.categoryId : "",
      categoryName: typeof item.category === "string" ? item.category
        : typeof item.categoryName === "string" ? item.categoryName : "",
      roman: typeof item.roman === "string" ? item.roman : ""
    };
  }

  // 解析导入内容：支持 JSON（含分类）与纯文本（每行一张 / --- 分隔）
  function parseImportedCards(text, fileName) {
    const source = String(text || "").trim();
    if (!source) return { cards: [], categories: [] };
    const looksJson = /\.json$/i.test(fileName || "") || /^[\[{]/.test(source);
    if (looksJson) {
      try {
        const parsed = JSON.parse(source);
        let values = [];
        let categories = [];
        if (Array.isArray(parsed)) {
          values = parsed;
        } else if (parsed && typeof parsed === "object") {
          if (Array.isArray(parsed.cards)) values = parsed.cards;
          else if (!Array.isArray(parsed.categories)) values = Object.values(parsed);
          if (Array.isArray(parsed.categories)) categories = parsed.categories;
        }
        return {
          cards: values.map(normalizeImportedCardShape).filter(Boolean),
          categories: categories.map(normalizeCategory).filter(Boolean)
        };
      } catch (error) {
        // 解析失败时退回按行解析
      }
    }
    const lines = source.includes("\n---\n")
      ? source.split(/\n\s*---\s*\n/)
      : source.split(/\r?\n/);
    return {
      cards: lines.map((line) => line.trim()).filter(Boolean).map((line) => ({ upright: line.slice(0, MAX_CARD_TEXT) })),
      categories: []
    };
  }

  function importCardsFromText(text, fileName) {
    const parsed = parseImportedCards(text, fileName);
    if (!parsed.cards.length) {
      showToast("没有读到可用的字卡", { icon: "card" });
      return;
    }

    // 先处理分类：按名称匹配已有分类，匹配不上就新建；建立「文件 id → 本地 id」映射
    const idMap = new Map();
    parsed.categories.forEach((cat) => {
      let local = state.cardCategories.find((item) => item.name === cat.name);
      if (!local) {
        if (state.cardCategories.length >= MAX_CATEGORIES) return;
        local = { id: uid(), name: cat.name, createdAt: Date.now() };
        state.cardCategories.push(local);
      }
      idMap.set(cat.id, local.id);
    });

    // 没有写分类的字卡：如果当前正停在某个分类里，就收进这个分类
    const fallbackCategory = findCategory(ui.cardFilter) ? ui.cardFilter : "";
    let added = 0;
    parsed.cards.forEach((raw) => {
      if (state.cards.length >= MAX_CARDS) return;
      const upright = String(raw.upright || "").trim().slice(0, MAX_CARD_TEXT);
      const name = String(raw.name || "").trim().slice(0, MAX_CARD_NAME) || cardNameFromText(upright);
      if (!name) return;
      // 去重：牌名 + 字卡内容都相同就跳过
      if (state.cards.some((card) => card.name === name && card.upright === upright)) return;

      let categoryId = "";
      if (raw.categoryId && idMap.has(raw.categoryId)) {
        categoryId = idMap.get(raw.categoryId);
      } else if (raw.categoryName) {
        const trimmed = raw.categoryName.trim().slice(0, MAX_CATEGORY_NAME);
        const hit = state.cardCategories.find((item) => item.name === trimmed);
        categoryId = hit ? hit.id : fallbackCategory;
      } else {
        categoryId = fallbackCategory;
      }

      state.cards.unshift({
        id: uid(),
        name,
        upright,
        reversed: String(raw.reversed || "").trim().slice(0, MAX_CARD_TEXT),
        note: String(raw.note || "").trim().slice(0, MAX_CARD_NOTE),
        categoryId,
        roman: String(raw.roman || "").slice(0, 8),
        createdAt: Date.now()
      });
      added += 1;
    });

    persist();
    syncCardCounts();
    dom.cardSearch.value = "";
    ui.cardQuery = "";
    renderCards();
    renderTarot();
    renderHome();
    if (added) {
      showToast("已导入 " + added + " 张字卡", { icon: "upload" });
      dom.cardsBody.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      showToast("这些字卡都已经在库里了", { icon: "check" });
    }
  }

  function exportCards() {
    const payload = {
      app: "梦境漫游",
      version: 3,
      exportedAt: new Date().toISOString(),
      char: activeChar().name,
      categories: state.cardCategories,
      cards: state.cards
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const now = new Date();
    a.href = url;
    a.download = "梦境漫游_字卡_" + now.getFullYear() + pad2(now.getMonth() + 1) + pad2(now.getDate()) + ".json";
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    showToast("字卡库已导出（含分类）", { icon: "download" });
  }

  /* =======================================================
     12. 表情 / 工具面板
     ======================================================= */
  function renderEmojiPanel() {
    const emojiFragment = document.createDocumentFragment();
    EMOJIS.forEach((emoji) => {
      const button = el("button", "", emoji);
      button.type = "button";
      button.dataset.emoji = emoji;
      button.setAttribute("aria-label", "插入 " + emoji);
      emojiFragment.appendChild(button);
    });
    dom.emojiGrid.replaceChildren(emojiFragment);

    const kaomojiFragment = document.createDocumentFragment();
    KAOMOJIS.forEach((kaomoji) => {
      const button = el("button", "", kaomoji);
      button.type = "button";
      button.dataset.kaomoji = kaomoji;
      button.setAttribute("aria-label", "插入 " + kaomoji);
      kaomojiFragment.appendChild(button);
    });
    dom.kaomojiGrid.replaceChildren(kaomojiFragment);
  }

  function switchEmojiTab(tab) {
    dom.emojiTabs.forEach((button) => {
      const active = button.dataset.emojiTab === tab;
      button.classList.toggle("active", active);
      button.setAttribute("aria-selected", active ? "true" : "false");
    });
    dom.emojiGrid.hidden = tab !== "emoji";
    dom.kaomojiGrid.hidden = tab !== "kaomoji";
  }

  function closePanels() {
    dom.toolPanel.classList.remove("open");
    dom.emojiPanel.classList.remove("open");
    dom.toolPanel.setAttribute("aria-hidden", "true");
    dom.emojiPanel.setAttribute("aria-hidden", "true");
    dom.plusBtn.classList.remove("active");
    dom.emojiBtn.classList.remove("active");
    dom.plusBtn.setAttribute("aria-expanded", "false");
    dom.emojiBtn.setAttribute("aria-expanded", "false");
    dom.panelScrim.hidden = true;
  }

  function openToolPanel() {
    const alreadyOpen = dom.toolPanel.classList.contains("open");
    closePanels();
    if (alreadyOpen) return;
    dom.toolPanel.classList.add("open");
    dom.toolPanel.setAttribute("aria-hidden", "false");
    dom.plusBtn.classList.add("active");
    dom.plusBtn.setAttribute("aria-expanded", "true");
    dom.panelScrim.hidden = false;
    dom.messageInput.blur();
  }

  function openEmojiPanel(tab) {
    const target = tab === "kaomoji" ? "kaomoji" : "emoji";
    const same = dom.emojiPanel.classList.contains("open") && (dom.kaomojiGrid.hidden === (target === "kaomoji"));
    closePanels();
    if (same) return;
    switchEmojiTab(target);
    dom.emojiPanel.classList.add("open");
    dom.emojiPanel.setAttribute("aria-hidden", "false");
    dom.emojiBtn.classList.add("active");
    dom.emojiBtn.setAttribute("aria-expanded", "true");
    dom.panelScrim.hidden = false;
    dom.messageInput.blur();
  }

  // 切换「我发给 TA」/「TA 发给我」
  function setToolMode(mode) {
    const target = mode === "char" ? "char" : "me";
    dom.toolPanel.dataset.mode = target;
    Array.from(dom.toolMode.querySelectorAll(".tool-mode-btn")).forEach((btn) => {
      const active = btn.dataset.mode === target;
      btn.classList.toggle("is-active", active);
      btn.setAttribute("aria-selected", active ? "true" : "false");
    });
    dom.toolsScrollMe.hidden = target !== "me";
    dom.toolsScrollChar.hidden = target !== "char";
    dom.toolDotsMe.hidden = target !== "me";
  }

  function updateToolPage() {
    const width = dom.toolsScrollMe.clientWidth || 1;
    const page = Math.round(dom.toolsScrollMe.scrollLeft / width);
    Array.from(dom.toolDotsMe.children).forEach((dot, index) => dot.classList.toggle("active", index === page));
  }

  /* =======================================================
     13. 输入区 & 发送
     ======================================================= */
  function autoResizeInput() {
    const input = dom.messageInput;
    input.style.height = "auto";
    input.style.height = Math.min(102, input.scrollHeight) + "px";
    updateSendButton();
  }

  function updateSendButton() {
    dom.sendBtn.disabled = dom.messageInput.value.trim().length === 0;
  }

  function insertAtCursor(text) {
    const input = dom.messageInput;
    const start = typeof input.selectionStart === "number" ? input.selectionStart : input.value.length;
    const end = typeof input.selectionEnd === "number" ? input.selectionEnd : input.value.length;
    input.value = input.value.slice(0, start) + text + input.value.slice(end);
    const caret = start + text.length;
    input.selectionStart = caret;
    input.selectionEnd = caret;
    autoResizeInput();
    input.focus();
  }

  function setQuoteDraft(quote) {
    ui.quoteDraft = quote;
    renderQuoteDraft();
    if (quote) {
      setTimeout(() => {
        dom.messageInput.focus();
        const length = dom.messageInput.value.length;
        dom.messageInput.setSelectionRange(length, length);
      }, 60);
    }
  }

  function clearQuoteDraft() {
    ui.quoteDraft = null;
    renderQuoteDraft();
  }

  // 追加一条我方消息（可选触发字卡回复）
  function addUserMessage(data, options) {
    const opts = options || {};
    const message = {
      id: uid(),
      role: "me",
      kind: data.kind || "text",
      text: data.text || "",
      time: Date.now(),
      quote: ui.quoteDraft ? { sender: ui.quoteDraft.sender, snippet: ui.quoteDraft.snippet } : null,
      meta: data.meta || null,
      cardNo: null
    };
    state.messages.push(message);
    ui.newMessageId = message.id;
    clearQuoteDraft();
    persist();
    closePanels();
    renderMessages({ forceScroll: true });
    if (opts.reply !== false) scheduleReply(message.id);
    return message;
  }

  // 追加一条角色消息（不需要等字卡）
  function pushCharMessage(data) {
    const message = {
      id: uid(),
      role: "char",
      kind: data.kind || "text",
      text: data.text || "",
      time: Date.now(),
      quote: null,
      meta: data.meta || null,
      cardNo: null
    };
    state.messages.push(message);
    ui.newMessageId = message.id;
    persist();
    renderMessages({ forceScroll: true });
    return message;
  }

  // 追加一条系统提示
  function pushSystemMessage(text) {
    const message = { id: uid(), role: "system", kind: "system", text, time: Date.now(), quote: null, meta: null, cardNo: null };
    state.messages.push(message);
    ui.newMessageId = message.id;
    persist();
    renderMessages({ forceScroll: true });
    return message;
  }

  function sendTextMessage() {
    const text = dom.messageInput.value.trim();
    if (!text) return;
    dom.messageInput.value = "";
    autoResizeInput();
    addUserMessage({ kind: "text", text });
    dom.messageInput.focus();
  }

  /* =======================================================
     14. 字卡回复队列
     ======================================================= */
  // 从当前梦角的字卡库里随机抽 count 句（聊天回复用）
  // 返回 { text, cardNo, name }，text 取「字卡内容」，没有内容时退回牌名
  function pickRandomCards(count) {
    const indices = [];
    state.cards.forEach((card, index) => {
      if (card && (card.upright || card.name)) indices.push(index);
    });
    for (let i = indices.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      const temp = indices[i];
      indices[i] = indices[j];
      indices[j] = temp;
    }
    const result = [];
    let cursor = 0;
    while (result.length < count && indices.length) {
      if (cursor >= indices.length) {
        cursor = 0;
        for (let i = indices.length - 1; i > 0; i -= 1) {
          const j = Math.floor(Math.random() * (i + 1));
          const temp = indices[i];
          indices[i] = indices[j];
          indices[j] = temp;
        }
      }
      const cardIndex = indices[cursor];
      const card = state.cards[cardIndex];
      result.push({
        text: cardLineText(card),
        cardNo: cardIndex + 1,
        name: card.name
      });
      cursor += 1;
    }
    return result;
  }

  // 可被中途打断的延时（清空聊天时能立刻中止）
  function interruptibleDelay(ms) {
    return new Promise((resolve) => {
      const timer = setTimeout(() => {
        ui.currentDelay = null;
        resolve();
      }, Math.max(0, ms));
      ui.currentDelay = {
        timer,
        finish: () => {
          clearTimeout(timer);
          ui.currentDelay = null;
          resolve();
        }
      };
    });
  }

  function cancelCurrentDelay() {
    if (!ui.currentDelay) return;
    const current = ui.currentDelay;
    ui.currentDelay = null;
    clearTimeout(current.timer);
    if (typeof current.finish === "function") current.finish();
  }

  function scheduleReply(sourceId, options) {
    const opts = options || {};
    if (!state.cards.length) {
      showToast("字卡库还是空的，先写一张想让 TA 说的话", {
        icon: "card",
        actionLabel: "去添加",
        duration: 4200,
        onAction: () => openPage("cards")
      });
      return;
    }
    const settings = state.settings;
    // 每条回复的条数在「最少 ~ 最多」之间随机；poke 之类可以强制指定 count
    const rangeMin = clamp(Math.round(numberOr(settings.replyMin, DEFAULT_SETTINGS.replyMin)), 1, MAX_REPLY_COUNT);
    const rangeMax = clamp(Math.round(numberOr(settings.replyMax, rangeMin)), rangeMin, MAX_REPLY_COUNT);
    const count = opts.count !== undefined
      ? clamp(Math.round(numberOr(opts.count, rangeMin)), 1, MAX_REPLY_COUNT)
      : rangeMin + Math.floor(Math.random() * (rangeMax - rangeMin + 1));
    const minMs = Math.max(200, numberOr(opts.minMs, settings.delayMinSeconds * 1000));
    let maxMs = Math.max(minMs + 300, numberOr(opts.maxMs, settings.delayMaxSeconds * 1000));
    if (opts.maxMs === undefined && maxMs < minMs) maxMs = minMs + 4000;

    ui.replyQueue.push({ id: uid(), sourceId, count, minMs, maxMs, version: ui.sessionVersion });
    ui.typing = true;
    renderHeader();
    renderMessages({ forceScroll: true });
    processReplyQueue();
  }

  function removeQueuedJob(job) {
    const index = ui.replyQueue.findIndex((item) => item.id === job.id);
    if (index >= 0) ui.replyQueue.splice(index, 1);
  }

  async function processReplyQueue() {
    if (ui.processing) return;
    ui.processing = true;

    while (ui.replyQueue.length) {
      const job = ui.replyQueue[0];
      if (job.version !== ui.sessionVersion) {
        removeQueuedJob(job);
        continue;
      }

      ui.typing = true;
      renderHeader();
      renderMessages();

      const delay = job.minMs + Math.random() * Math.max(0, job.maxMs - job.minMs);
      await interruptibleDelay(delay);

      if (job.version !== ui.sessionVersion) {
        removeQueuedJob(job);
        continue;
      }

      removeQueuedJob(job);
      const picks = pickRandomCards(job.count);
      if (!picks.length) {
        pushSystemMessage("字卡库空了，去写一张新的句子吧");
        continue;
      }

      for (let i = 0; i < picks.length; i += 1) {
        if (job.version !== ui.sessionVersion) break;
        if (i > 0) {
          await interruptibleDelay(1050 + Math.random() * 1450);
          if (job.version !== ui.sessionVersion) break;
        }
        const pick = picks[i];
        const message = { id: uid(), role: "char", kind: "text", text: pick.text, time: Date.now(), quote: null, meta: null, cardNo: pick.cardNo };
        state.messages.push(message);
        ui.newMessageId = message.id;
        persist();
        renderMessages();
      }
    }

    ui.processing = false;
    ui.typing = false;
    renderHeader();
    renderMessages();
  }

  /* =======================================================
     14.5 主动消息 / 主动来信
     —— 按「聊天设置」里的开关与间隔，定时让 TA 主动来找你
     ======================================================= */
  let proactiveMessageTimer = null;
  let proactiveLetterTimer = null;

  function randomBetween(min, max) {
    if (max <= min) return min;
    return min + Math.random() * (max - min);
  }

  function restartProactiveTimers() {
    scheduleProactiveMessage();
    scheduleProactiveLetter();
  }

  function scheduleProactiveMessage() {
    if (proactiveMessageTimer) {
      clearTimeout(proactiveMessageTimer);
      proactiveMessageTimer = null;
    }
    const cfg = state.settings.proactiveMessage;
    if (!cfg || !cfg.on) return;
    const wait = randomBetween(cfg.minMinutes * 60000, cfg.maxMinutes * 60000);
    proactiveMessageTimer = setTimeout(deliverProactiveMessage, Math.max(1000, wait));
  }

  function deliverProactiveMessage() {
    proactiveMessageTimer = null;
    const cfg = state.settings.proactiveMessage;
    if (!cfg || !cfg.on) return;
    const char = activeChar();
    const pool = state.cards.length
      ? state.cards.map((card) => cardLineText(card)).filter(Boolean)
      : DEFAULT_CARDS.slice();
    // 防御：字卡库存在但都没有可用文案时，退回内置句子，避免发出空消息
    const safePool = pool.length ? pool : DEFAULT_CARDS;
    const text = safePool[Math.floor(Math.random() * safePool.length)];
    const message = {
      id: uid(),
      role: "char",
      kind: "text",
      text,
      time: Date.now(),
      quote: null,
      meta: { proactive: true },
      cardNo: null
    };
    state.messages.push(message);
    ui.newMessageId = message.id;
    persist();
    renderMessages();
    renderHome();
    showToast(char.name + " 主动发来一条消息", {
      icon: "heart",
      actionLabel: "去看看",
      duration: 4200,
      onAction: () => openPage("chat")
    });
    scheduleProactiveMessage();
  }

  function scheduleProactiveLetter() {
    if (proactiveLetterTimer) {
      clearTimeout(proactiveLetterTimer);
      proactiveLetterTimer = null;
    }
    const cfg = state.settings.proactiveLetter;
    if (!cfg || !cfg.on) return;
    const wait = randomBetween(cfg.minHours * 3600000, cfg.maxHours * 3600000);
    // setTimeout 的上限约 24.8 天，这里做个保护
    proactiveLetterTimer = setTimeout(deliverProactiveLetter, Math.min(wait, 2147483000));
  }

  function deliverProactiveLetter() {
    proactiveLetterTimer = null;
    const cfg = state.settings.proactiveLetter;
    if (!cfg || !cfg.on) return;
    const pick = PROACTIVE_LETTERS[Math.floor(Math.random() * PROACTIVE_LETTERS.length)];
    const now = Date.now();
    state.mail.letters.push({
      id: uid(),
      from: "char",
      title: pick.title,
      body: pick.body,
      createdAt: now,
      updatedAt: now
    });
    persist();
    renderMail();
    renderHome();
    showToast(activeChar().name + " 往信箱里投了一封信", {
      icon: "envelope",
      actionLabel: "去看看",
      duration: 4200,
      onAction: () => openPage("mail")
    });
    scheduleProactiveLetter();
  }

  /* =======================================================
     15. 消息操作（引用 / 复制 / 撤回 / 删除）
     ======================================================= */
  function openActionSheet(messageId) {
    const message = state.messages.find((item) => item.id === messageId);
    if (!message || message.role === "system" || message.kind === "system") return;
    ui.actionMessageId = messageId;

    const label = message.role === "me" ? "你的消息" : "来自 " + state.settings.charName + " 的消息";
    dom.actionPreview.replaceChildren(el("b", "", label), el("p", "", messagePreview(message)));

    const actions = [
      { key: "quote", label: "引用这条消息", icon: "quote", hint: "放在回复上方" },
      { key: "copy", label: "复制内容", icon: "copy", hint: "" }
    ];
    if (message.role === "me") {
      if (Date.now() - message.time < 2 * 60 * 1000) actions.push({ key: "recall", label: "撤回这条消息", icon: "recall", hint: "2 分钟内" });
      actions.push({ key: "delete", label: "删除这条消息", icon: "trash", hint: "仅自己可见", danger: true });
    } else {
      actions.push({ key: "delete", label: "删除这条消息", icon: "trash", hint: "从聊天中移除", danger: true });
    }

    const fragment = document.createDocumentFragment();
    actions.forEach((action) => {
      const button = el("button", "action-item" + (action.danger ? " danger" : ""));
      button.type = "button";
      button.dataset.action = action.key;
      const iconWrap = el("span", "action-icon");
      iconWrap.appendChild(makeIcon(action.icon));
      button.appendChild(iconWrap);
      button.appendChild(el("span", "", action.label));
      if (action.hint) button.appendChild(el("small", "", action.hint));
      fragment.appendChild(button);
    });
    dom.actionList.replaceChildren(fragment);

    dom.actionLayer.classList.add("open");
    dom.actionLayer.setAttribute("aria-hidden", "false");
  }

  function closeActionSheet() {
    dom.actionLayer.classList.remove("open");
    dom.actionLayer.setAttribute("aria-hidden", "true");
    ui.actionMessageId = null;
  }

  function replaceMessageWithSystem(index, text) {
    const old = state.messages[index];
    if (!old) return;
    state.messages[index] = { id: old.id, role: "system", kind: "system", text, time: old.time, quote: null, meta: null, cardNo: null };
    persist();
    renderMessages();
  }

  async function copyText(text) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (error) {
      const area = document.createElement("textarea");
      area.value = text;
      area.style.position = "fixed";
      area.style.opacity = "0";
      document.body.appendChild(area);
      area.select();
      let ok = false;
      try {
        ok = document.execCommand("copy");
      } catch (err) {
        ok = false;
      }
      area.remove();
      return ok;
    }
  }

  async function performMessageAction(action) {
    const id = ui.actionMessageId;
    const index = state.messages.findIndex((item) => item.id === id);
    const message = index >= 0 ? state.messages[index] : null;
    if (!message) {
      closeActionSheet();
      return;
    }

    if (action === "quote") {
      setQuoteDraft({ sender: senderLabel(message), snippet: messagePreview(message).slice(0, 140) });
      closeActionSheet();
      showToast("已引用，继续写下你的话吧", { icon: "quote" });
      return;
    }
    if (action === "copy") {
      const ok = await copyText(messagePreview(message));
      closeActionSheet();
      showToast(ok ? "已复制到剪贴板" : "复制失败，请长按文字选择", { icon: ok ? "check" : "copy" });
      return;
    }
    if (action === "recall") {
      replaceMessageWithSystem(index, "你撤回了一条消息");
      closeActionSheet();
      showToast("消息已撤回", { icon: "recall" });
      return;
    }
    if (action === "delete") {
      const text = message.role === "me"
        ? "你删除了一条消息"
        : "你删除了一条来自「" + state.settings.charName + "」的消息";
      replaceMessageWithSystem(index, text);
      closeActionSheet();
      showToast("消息已删除", { icon: "trash" });
    }
  }

  /* =======================================================
     16. 语音录制（模拟）
     ======================================================= */
  function startRecording() {
    if (ui.recording) return;
    ui.recording = { startedAt: Date.now() };
    dom.recordingHint.hidden = false;
    dom.recordTime.textContent = "00:00";
    dom.micBtn.classList.add("active");
    clearInterval(ui.recordTimer);
    ui.recordTimer = setInterval(() => {
      if (!ui.recording) return;
      dom.recordTime.textContent = formatDuration(Math.floor((Date.now() - ui.recording.startedAt) / 1000));
    }, 240);
  }

  function stopRecording() {
    if (!ui.recording) return;
    const elapsed = Date.now() - ui.recording.startedAt;
    const seconds = Math.max(1, Math.round(elapsed / 1000));
    ui.recording = null;
    clearInterval(ui.recordTimer);
    ui.recordTimer = null;
    dom.recordingHint.hidden = true;
    dom.micBtn.classList.remove("active");
    ui.ignoreMicClickUntil = Date.now() + 450;
    if (elapsed < 850) {
      showToast("按住麦克风按钮说话，松开即可发送", { icon: "mic" });
      return;
    }
    addUserMessage({ kind: "voice", text: "语音 " + seconds + "″", meta: { duration: seconds } });
  }

  function cancelRecording() {
    if (!ui.recording) return;
    ui.recording = null;
    clearInterval(ui.recordTimer);
    ui.recordTimer = null;
    dom.recordingHint.hidden = true;
    dom.micBtn.classList.remove("active");
    ui.ignoreMicClickUntil = Date.now() + 300;
    showToast("已取消录音", { icon: "mic" });
  }

  /* =======================================================
     17. 图片处理
     ======================================================= */
  function compressImage(file) {
    return new Promise((resolve, reject) => {
      const objectUrl = URL.createObjectURL(file);
      const image = new Image();
      image.onload = () => {
        try {
          const maxEdge = 1100;
          const scale = Math.min(1, maxEdge / Math.max(image.naturalWidth, image.naturalHeight));
          const width = Math.max(1, Math.round(image.naturalWidth * scale));
          const height = Math.max(1, Math.round(image.naturalHeight * scale));
          const canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          ctx.fillStyle = "#fffdfb";
          ctx.fillRect(0, 0, width, height);
          ctx.drawImage(image, 0, 0, width, height);
          const dataUrl = canvas.toDataURL("image/jpeg", 0.82);
          URL.revokeObjectURL(objectUrl);
          resolve(dataUrl);
        } catch (error) {
          URL.revokeObjectURL(objectUrl);
          reject(error);
        }
      };
      image.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        reject(new Error("image load failed"));
      };
      image.src = objectUrl;
    });
  }

  async function handleImageFile(file) {
    if (!file) return;
    if (!file.type || !file.type.startsWith("image/")) {
      showToast("请选择一张图片", { icon: "image" });
      return;
    }
    showToast("正在把图片收进消息里…", { icon: "image", duration: 1200 });
    try {
      const src = await compressImage(file);
      addUserMessage({ kind: "image", text: "图片", meta: { src } });
    } catch (error) {
      showToast("图片读取失败了，换一张试试", { icon: "image" });
    }
  }

  /* =======================================================
     18. 工具入口（我方 + 角色方）
     ======================================================= */
  function handleTool(tool) {
    closePanels();
    if (tool === "image") return dom.imageInput.click();
    if (tool === "camera") return dom.cameraInput.click();
    if (tool === "redpacket") return openRedPacketModal();
    if (tool === "call") return startCall();
    if (tool === "kaomoji") return setTimeout(() => openEmojiPanel("kaomoji"), 120);
    if (tool === "dice") {
      const value = Math.floor(Math.random() * 6) + 1;
      return addUserMessage({ kind: "dice", text: "掷出了 " + value + " 点", meta: { value } });
    }
    if (tool === "draw") return openDoodleModal();
    if (tool === "decide") return openDecisionModal();
    if (tool === "location") return openLocationModal();
    if (tool === "music") {
      const music = RANDOM_MUSIC[Math.floor(Math.random() * RANDOM_MUSIC.length)];
      addUserMessage({ kind: "music", text: "《" + music.title + "》 · " + music.artist, meta: music });
      showToast("分享了一首歌给 " + state.settings.charName, { icon: "music" });
      return;
    }
    if (tool === "gift") {
      const gift = RANDOM_GIFTS[Math.floor(Math.random() * RANDOM_GIFTS.length)];
      addUserMessage({ kind: "gift", text: gift.name, meta: { gift: gift.name, line: gift.line } });
      showToast("礼物已经送到啦", { icon: "gift" });
      return;
    }
    if (tool === "poke") return pokeCharacter();
    // 角色方向
    if (tool === "charRedpacket") return characterSendRedPacket();
    if (tool === "charDoodle") return characterSendDoodle();
    if (tool === "charGift") return characterSendGift();
    if (tool === "charPoke") return characterPokeUser();
  }

  // 我戳 TA
  function pokeCharacter() {
    const name = state.settings.charName;
    pushSystemMessage("你戳了戳「" + name + "」");
    scheduleReply(null, { count: 1, minMs: 900, maxMs: 2300 });
  }

  // TA 戳我
  function characterPokeUser() {
    const name = state.settings.charName;
    pushSystemMessage("「" + name + "」戳了戳你");
    setTimeout(() => {
      if (state.cards.length) {
        const pick = pickRandomCards(1)[0];
        if (pick) pushCharMessage({ kind: "text", text: pick.text, meta: null });
      }
    }, 700);
    showToast(name + " 戳了戳你", { icon: "poke" });
  }

  // TA 发红包（金额由 TA 自己决定）
  function characterSendRedPacket() {
    // 随机一个“有心意”的金额：1.11 ~ 52.00，多为带有小心思的数字
    const nice = [1.11, 2.22, 5.20, 6.66, 8.88, 9.99, 13.14, 20.00, 25.00, 33.33, 52.00];
    const amount = nice[Math.floor(Math.random() * nice.length)];
    const blessing = CHAR_BLESSINGS[Math.floor(Math.random() * CHAR_BLESSINGS.length)];
    pushCharMessage({ kind: "redpacket", text: "红包 ¥" + amount.toFixed(2), meta: { amount, blessing, from: "char" } });
    showToast(state.settings.charName + " 给你塞了一个红包", { icon: "redpacket" });
  }

  // TA 送礼物
  function characterSendGift() {
    const gift = RANDOM_GIFTS[Math.floor(Math.random() * RANDOM_GIFTS.length)];
    pushCharMessage({ kind: "gift", text: gift.name, meta: { gift: gift.name, line: gift.line } });
    showToast(state.settings.charName + " 送了你一份礼物", { icon: "gift" });
  }

  // TA 画涂鸦（用 canvas 现场生成一幅随笔画）
  function characterSendDoodle() {
    try {
      const src = generateDoodleImage();
      pushCharMessage({ kind: "image", text: "TA 的涂鸦", meta: { src } });
      showToast(state.settings.charName + " 画了一张涂鸦给你", { icon: "draw" });
    } catch (error) {
      showToast("涂鸦生成失败了，再试一次吧", { icon: "draw" });
    }
  }

  // 生成随笔画：随机小爱心 + 曲线，颜色贴合主题色
  function generateDoodleImage() {
    const canvas = document.createElement("canvas");
    canvas.width = 420;
    canvas.height = 300;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#fffdfb";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    const colors = ["#8d68c9", "#d9889f", "#7395c4", "#c4a060"];
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    // 随机几条柔和曲线
    for (let i = 0; i < 4; i += 1) {
      ctx.strokeStyle = colors[Math.floor(Math.random() * colors.length)];
      ctx.lineWidth = 2 + Math.random() * 2;
      ctx.globalAlpha = 0.75;
      ctx.beginPath();
      let x = 30 + Math.random() * 60;
      let y = 40 + Math.random() * 200;
      ctx.moveTo(x, y);
      for (let s = 0; s < 5; s += 1) {
        x += 40 + Math.random() * 40;
        y += (Math.random() - 0.5) * 90;
        ctx.quadraticCurveTo(x - 20, y - 30, x, y);
      }
      ctx.stroke();
    }

    // 画几颗小心心
    const heartCount = 3 + Math.floor(Math.random() * 3);
    for (let i = 0; i < heartCount; i += 1) {
      const cx = 60 + Math.random() * 300;
      const cy = 60 + Math.random() * 180;
      const size = 10 + Math.random() * 12;
      ctx.globalAlpha = 0.9;
      ctx.fillStyle = colors[Math.floor(Math.random() * colors.length)];
      drawHeart(ctx, cx, cy, size);
    }

    ctx.globalAlpha = 1;
    return canvas.toDataURL("image/jpeg", 0.88);
  }

  function drawHeart(ctx, cx, cy, size) {
    ctx.beginPath();
    ctx.moveTo(cx, cy + size * 0.4);
    ctx.bezierCurveTo(cx + size, cy - size * 0.5, cx + size * 0.5, cy - size * 1.2, cx, cy - size * 0.5);
    ctx.bezierCurveTo(cx - size * 0.5, cy - size * 1.2, cx - size, cy - size * 0.5, cx, cy + size * 0.4);
    ctx.fill();
  }

  function openRedPacketModal() {
    openModal({
      icon: "redpacket",
      title: "塞一个红包",
      sub: "金额和祝福语都会一起送到 " + state.settings.charName + " 那里。",
      body:
        '<label class="modal-field"><span>金额（元）</span><div class="amount-input-wrap"><em>¥</em><input id="redAmount" type="number" inputmode="decimal" min="0.01" max="200" step="0.01" value="5.20"></div></label>' +
        '<label class="modal-field"><span>祝福语</span><input id="redBlessing" type="text" maxlength="24" value="今天也要开心"></label>',
      confirmText: "塞进红包",
      onConfirm: (dialog) => {
        const amount = Number(dialog.querySelector("#redAmount").value);
        const blessing = dialog.querySelector("#redBlessing").value.trim() || "恭喜发财，大吉大利";
        if (!Number.isFinite(amount) || amount <= 0 || amount > 200) {
          showToast("红包金额要在 0.01 到 200 元之间", { icon: "redpacket" });
          return false;
        }
        addUserMessage({ kind: "redpacket", text: "红包 ¥" + amount.toFixed(2), meta: { amount, blessing } });
        showToast("红包已经送达", { icon: "redpacket" });
      }
    });
  }

  function openDecisionModal() {
    openModal({
      icon: "decide",
      title: "帮我抉择",
      sub: "把犹豫写下来，让字卡替你做一次小小的决定。",
      body:
        '<div class="choice-spark"><svg class="icon"><use href="#i-sparkle"></use></svg><span>每行一个选项，至少写两个。交给一点点随机和一点点命运。</span></div>' +
        '<label class="modal-field"><span>选项</span><textarea id="choiceOptions" maxlength="300">去吃火锅\n去看一场电影\n去散步吹晚风</textarea></label>',
      confirmText: "让字卡替我选",
      onConfirm: (dialog) => {
        const raw = dialog.querySelector("#choiceOptions").value;
        const options = Array.from(new Set(raw.split(/\r?\n/).map((item) => item.trim()).filter(Boolean)));
        if (options.length < 2) {
          showToast("至少写下两个选项，字卡才选得出来", { icon: "decide" });
          return false;
        }
        const choice = options[Math.floor(Math.random() * options.length)];
        addUserMessage({ kind: "decision", text: "帮我抉择：" + choice, meta: { choice, options } });
        showToast("字卡替你选了：" + choice, { icon: "sparkle", duration: 3200 });
      }
    });
  }

  function openLocationModal() {
    openModal({
      icon: "location",
      title: "分享一个地方",
      sub: "把此刻想去的地方，连同一点点心情一起发过去。",
      body:
        '<label class="modal-field"><span>地点</span><input id="locationName" type="text" maxlength="24" value="月光码头"></label>' +
        '<label class="modal-field"><span>想说的话</span><input id="locationDetail" type="text" maxlength="40" value="一个很适合一起发呆的地方"></label>',
      confirmText: "分享位置",
      onConfirm: (dialog) => {
        const place = dialog.querySelector("#locationName").value.trim() || "月光码头";
        const detail = dialog.querySelector("#locationDetail").value.trim() || "一个很适合一起发呆的地方";
        addUserMessage({ kind: "location", text: "位置：" + place, meta: { place, detail } });
        showToast("位置已经分享给 " + state.settings.charName, { icon: "location" });
      }
    });
  }

  /* =======================================================
     19. 涂鸦（我来画）
     ======================================================= */
  function openDoodleModal() {
    openModal({
      icon: "draw",
      title: "随手涂鸦",
      sub: "画一点只有你们懂的图案，再把它变成一张小小的图片。",
      body:
        '<div class="doodle-wrap">' +
          '<div class="doodle-canvas-shell"><canvas id="doodleCanvas"></canvas></div>' +
          '<div class="doodle-tools">' +
            '<div class="doodle-colors">' +
              '<button class="color-dot active" data-color="#8d68c9" style="background:#8d68c9;color:#8d68c9" aria-label="紫色"></button>' +
              '<button class="color-dot" data-color="#d9889f" style="background:#d9889f;color:#d9889f" aria-label="粉色"></button>' +
              '<button class="color-dot" data-color="#7395c4" style="background:#7395c4;color:#7395c4" aria-label="蓝色"></button>' +
              '<button class="color-dot" data-color="#c4a060" style="background:#c4a060;color:#c4a060" aria-label="金色"></button>' +
              '<button class="color-dot" data-color="#4f3f60" style="background:#4f3f60;color:#4f3f60" aria-label="深色"></button>' +
            '</div>' +
            '<button class="doodle-clear" id="doodleClear" type="button">清空画布</button>' +
          '</div>' +
        '</div>',
      confirmText: "发给 TA",
      onMount: (dialog) => setupDoodle(dialog),
      onConfirm: (dialog) => {
        if (!ui.doodle || !ui.doodle.isDirty()) {
          showToast("先在画布上留一点什么吧", { icon: "draw" });
          return false;
        }
        const canvas = dialog.querySelector("#doodleCanvas");
        const output = document.createElement("canvas");
        output.width = canvas.width;
        output.height = canvas.height;
        const ctx = output.getContext("2d");
        ctx.fillStyle = "#fffdfb";
        ctx.fillRect(0, 0, output.width, output.height);
        ctx.drawImage(canvas, 0, 0);
        const src = output.toDataURL("image/jpeg", 0.88);
        addUserMessage({ kind: "image", text: "涂鸦", meta: { src } });
        showToast("涂鸦已经送出", { icon: "draw" });
      }
    });
  }

  function setupDoodle(dialog) {
    const canvas = dialog.querySelector("#doodleCanvas");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.max(1, Math.round(rect.width * dpr));
    canvas.height = Math.max(1, Math.round(rect.height * dpr));
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineWidth = 2.6;
    ctx.strokeStyle = "#8d68c9";

    let drawing = false;
    let dirty = false;
    let lastX = 0;
    let lastY = 0;

    const pointFromEvent = (event) => {
      const box = canvas.getBoundingClientRect();
      return {
        x: ((event.clientX - box.left) / box.width) * rect.width,
        y: ((event.clientY - box.top) / box.height) * rect.height
      };
    };

    canvas.addEventListener("pointerdown", (event) => {
      event.preventDefault();
      drawing = true;
      const point = pointFromEvent(event);
      lastX = point.x;
      lastY = point.y;
      ctx.beginPath();
      ctx.moveTo(lastX, lastY);
      ctx.lineTo(lastX + 0.1, lastY + 0.1);
      ctx.stroke();
      dirty = true;
      canvas.setPointerCapture(event.pointerId);
    });

    canvas.addEventListener("pointermove", (event) => {
      if (!drawing) return;
      event.preventDefault();
      const point = pointFromEvent(event);
      ctx.beginPath();
      ctx.moveTo(lastX, lastY);
      ctx.lineTo(point.x, point.y);
      ctx.stroke();
      lastX = point.x;
      lastY = point.y;
      dirty = true;
    });

    const stopDrawing = () => { drawing = false; };
    canvas.addEventListener("pointerup", stopDrawing);
    canvas.addEventListener("pointercancel", stopDrawing);
    canvas.addEventListener("pointerleave", () => { if (drawing) drawing = false; });

    dialog.querySelectorAll(".color-dot").forEach((button) => {
      button.addEventListener("click", () => {
        dialog.querySelectorAll(".color-dot").forEach((item) => item.classList.remove("active"));
        button.classList.add("active");
        ctx.strokeStyle = button.dataset.color || "#8d68c9";
      });
    });

    const clear = dialog.querySelector("#doodleClear");
    if (clear) {
      clear.addEventListener("click", () => {
        ctx.clearRect(0, 0, rect.width, rect.height);
        dirty = false;
      });
    }

    ui.doodle = { canvas, isDirty: () => dirty };
  }

  /* =======================================================
     20. 语音通话（含最小化）
     ======================================================= */
  function startCall() {
    if (ui.currentCall) return;
    const current = { open: true, connected: false, minimized: false, startAt: 0, seconds: 0, connectTimer: null, timer: null };
    ui.currentCall = current;
    dom.callStatus.textContent = "正在接通…";
    dom.callTimer.textContent = "00:00";
    dom.callMiniTimer.textContent = "00:00";
    dom.callQuote.textContent = RANDOM_CALL_QUOTES[Math.floor(Math.random() * RANDOM_CALL_QUOTES.length)];
    dom.muteBtn.classList.remove("active");
    dom.speakerBtn.classList.remove("active");
    dom.callLayer.classList.remove("is-minimized");
    dom.callLayer.classList.add("open");
    dom.callLayer.setAttribute("aria-hidden", "false");
    dom.callMini.hidden = true;

    current.connectTimer = setTimeout(() => {
      if (!ui.currentCall || !ui.currentCall.open) return;
      current.connected = true;
      current.startAt = Date.now();
      dom.callStatus.textContent = "通话中";
      current.timer = setInterval(() => {
        if (!ui.currentCall) return;
        current.seconds = Math.floor((Date.now() - current.startAt) / 1000);
        const label = formatDuration(current.seconds);
        dom.callTimer.textContent = label;
        dom.callMiniTimer.textContent = label;
      }, 500);
    }, 1500 + Math.random() * 900);
  }

  // 缩小通话为悬浮胶囊
  function minimizeCall() {
    const current = ui.currentCall;
    if (!current) return;
    current.minimized = true;
    dom.callLayer.classList.add("is-minimized");
    dom.callMini.hidden = false;
    dom.callMiniTimer.textContent = current.connected ? formatDuration(current.seconds) : "00:00";
    showToast("通话已缩小，点右下角可以回到通话", { icon: "minimize", duration: 2200 });
  }

  // 从胶囊恢复通话
  function restoreCall() {
    const current = ui.currentCall;
    if (!current) {
      dom.callMini.hidden = true;
      return;
    }
    current.minimized = false;
    dom.callLayer.classList.remove("is-minimized");
    dom.callMini.hidden = true;
  }

  function endCall() {
    const current = ui.currentCall;
    if (!current) return;
    clearTimeout(current.connectTimer);
    clearInterval(current.timer);
    ui.currentCall = null;
    dom.callLayer.classList.remove("open");
    dom.callLayer.classList.remove("is-minimized");
    dom.callLayer.setAttribute("aria-hidden", "true");
    dom.callMini.hidden = true;

    const duration = current.connected ? Math.max(0, Math.floor((Date.now() - current.startAt) / 1000)) : 0;
    // 写入通话历史
    state.calls.push({ id: uid(), duration, connected: current.connected, time: Date.now() });
    if (state.calls.length > 200) state.calls = state.calls.slice(-200);
    pushSystemMessage(current.connected ? "语音通话 · " + formatDuration(duration) : "已取消语音通话");
    renderMine();
    showToast(current.connected ? "通话已结束" : "已取消通话", { icon: "phone" });
  }

  /* =======================================================
     21. 清空聊天
     ======================================================= */
  function clearConversation() {
    ui.sessionVersion += 1;
    ui.replyQueue = [];
    cancelCurrentDelay();
    ui.typing = false;
    state.messages = [];
    clearQuoteDraft();
    persist();
    renderHeader();
    renderMessages({ forceScroll: true });
    showToast("聊天记录已清空", { icon: "check" });
  }

  /* =======================================================
     22. 塔罗传讯字卡
     ======================================================= */
  function favKeyOf(recordId, index) {
    return recordId + ":" + index;
  }

  function isTarotFav(recordId, index) {
    const key = favKeyOf(recordId, index);
    return state.tarot.favorites.some((f) => f.key === key);
  }

  // 当前抽卡范围对应的可用字卡池（有字卡内容或牌名即可抽）
  function cardsInDrawScope(scope) {
    const usable = state.cards.filter((card) => card.upright || card.name);
    if (scope === "none") return usable.filter((card) => !findCategory(card.categoryId));
    if (scope !== "all" && findCategory(scope)) return usable.filter((card) => card.categoryId === scope);
    return usable;
  }

  // 抽卡范围的横向标签栏（全部 / 各分类 / 未分类）
  function renderTarotScope() {
    if (ui.tarotScope !== "all" && ui.tarotScope !== "none" && !findCategory(ui.tarotScope)) {
      ui.tarotScope = "all";
    }
    const frag = document.createDocumentFragment();
    const chips = [{ value: "all", label: "全部" }];
    state.cardCategories.forEach((cat) => chips.push({ value: cat.id, label: cat.name }));
    // 没有分类时「未分类」等于「全部」，就不重复出现了
    if (state.cardCategories.length && state.cards.some((card) => !findCategory(card.categoryId))) {
      chips.push({ value: "none", label: "未分类" });
    }

    chips.forEach((item) => {
      const chip = el("button", "cat-chip" + (ui.tarotScope === item.value ? " is-active" : ""));
      chip.type = "button";
      chip.dataset.scope = item.value;
      chip.appendChild(el("span", "", item.label));
      chip.appendChild(el("em", "", cardsInDrawScope(item.value).length));
      frag.appendChild(chip);
    });
    dom.tarotScopeBar.replaceChildren(frag);
  }

  // 抽塔罗：count = 1 或 3，牌池来自当前梦角的字卡库
  function drawTarot(count) {
    const question = dom.tarotQuestion.value.trim().slice(0, 40);
    const pool = cardsInDrawScope(ui.tarotScope);
    const scopeName = ui.tarotScope === "all" ? "" : (ui.tarotScope === "none" ? "未分类" : categoryNameOf(ui.tarotScope));

    if (!pool.length) {
      showToast(scopeName ? "「" + scopeName + "」里还没有字卡，先写一张吧" : "字卡库还是空的，先写一张吧", {
        icon: "card",
        actionLabel: "去添加",
        duration: 4200,
        onAction: () => openPage("cards")
      });
      return;
    }
    if (pool.length < count) {
      showToast("这个范围只有 " + pool.length + " 张字卡，先抽一张吧", { icon: "card" });
      return;
    }

    // 洗牌后取前 count 张，保证一次抽卡不会重复
    const shuffled = pool.slice();
    for (let i = shuffled.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      const temp = shuffled[i];
      shuffled[i] = shuffled[j];
      shuffled[j] = temp;
    }

    const positions = count === 3 ? ["过去", "现在", "未来"] : [""];
    const chosen = shuffled.slice(0, count).map((card, i) => {
      // 内置塔罗约三成概率逆位；没有写逆位释义时沿用字卡内容
      const reversed = Boolean(card.reversed) && Math.random() < 0.32;
      const meaning = (reversed ? card.reversed : (card.upright || card.name)) || card.name;
      return {
        name: card.name || cardNameFromText(card.upright),
        roman: card.roman || "",
        reversed,
        meaning: /[。！？…～~]$/.test(meaning) ? meaning : meaning + "。",
        position: positions[i]
      };
    });

    const record = { id: uid(), question, time: Date.now(), cards: chosen };
    state.tarot.records.unshift(record);
    if (state.tarot.records.length > 60) state.tarot.records = state.tarot.records.slice(0, 60);
    persist();

    renderTarotResult(record);
    renderTarot();
    renderHome();
    showToast("抽到了「" + chosen[0].name + "」", { icon: "tarot", duration: 2200 });
  }

  // 渲染最近一次抽卡结果
  function renderTarotResult(record) {
    if (!record || !record.cards.length) {
      dom.tarotResult.hidden = true;
      dom.tarotResult.replaceChildren();
      return;
    }
    dom.tarotResult.hidden = false;
    const frag = document.createDocumentFragment();

    const head = el("div", "block-head");
    head.appendChild(el("b", "", record.question ? "问题：" + record.question : "无题抽卡"));
    head.appendChild(el("small", "", formatDateTime(record.time)));
    frag.appendChild(head);

    record.cards.forEach((card, index) => {
      const wrap = el("article", "tarot-card");
      const face = el("div", "tarot-card-face" + (card.reversed ? " is-reversed" : ""));
      face.textContent = Array.from(card.name)[0] || "✶";
      wrap.appendChild(face);

      const body = el("div", "tarot-card-body");
      const nameRow = el("div", "tarot-name");
      nameRow.appendChild(document.createTextNode(card.position ? card.position + " · " + card.name : card.name));
      const metaParts = [];
      if (card.roman) metaParts.push(card.roman);
      metaParts.push(card.reversed ? "逆位" : "正位");
      nameRow.appendChild(el("em", "", "· " + metaParts.join(" · ")));
      body.appendChild(nameRow);
      body.appendChild(el("p", "", "“" + card.meaning + "”"));
      wrap.appendChild(body);

      const fav = el("button", "icon-mini tarot-card-fav" + (isTarotFav(record.id, index) ? " is-on" : ""));
      fav.type = "button";
      fav.setAttribute("aria-label", "收藏这条传讯");
      fav.appendChild(makeIcon("star"));
      fav.addEventListener("click", () => toggleTarotFav(record, index));
      wrap.appendChild(fav);

      frag.appendChild(wrap);
    });

    dom.tarotResult.replaceChildren(frag);
  }

  // 收藏 / 取消收藏某条塔罗传讯
  function toggleTarotFav(record, index) {
    const key = favKeyOf(record.id, index);
    const existing = state.tarot.favorites.findIndex((f) => f.key === key);
    if (existing >= 0) {
      state.tarot.favorites.splice(existing, 1);
      showToast("已取消收藏", { icon: "star" });
    } else {
      const card = record.cards[index];
      state.tarot.favorites.unshift({
        id: uid(),
        key,
        name: card.name,
        roman: card.roman,
        reversed: card.reversed,
        meaning: card.meaning,
        question: record.question,
        time: Date.now()
      });
      showToast("已收藏这条传讯", { icon: "star" });
    }
    persist();
    renderTarotResult(record);
    renderTarot();
    renderMine();
  }

  function renderTarot() {
    dom.tarotFavBtn.classList.toggle("is-on", ui.tarotFilter);
    renderTarotScope();
    const all = state.tarot.records;
    const favKeys = new Set(state.tarot.favorites.map((f) => f.key));
    const list = ui.tarotFilter ? all.filter((r) => r.cards.some((c, i) => favKeys.has(favKeyOf(r.id, i)))) : all;

    dom.tarotRecordCount.textContent = list.length + " 条";

    if (!list.length) {
      dom.tarotRecordList.replaceChildren(
        ui.tarotFilter
          ? buildEmptySlot("star", "还没有收藏的传讯", "点亮结果卡片右上角的小星星即可收藏。")
          : buildEmptySlot("tarot", "还没有抽卡记录", "写下一个问题，抽一张属于此刻的字卡吧。")
      );
      return;
    }

    const frag = document.createDocumentFragment();
    list.forEach((record) => {
      const item = el("div", "list-item");
      const main = el("div", "list-item-main");
      main.appendChild(el("b", "", record.question || "无题抽卡"));
      const names = record.cards.map((c, i) => c.name + (c.reversed ? "（逆）" : "")).join(" · ");
      main.appendChild(el("p", "", names));
      main.appendChild(el("small", "", formatDateTime(record.time)));
      item.appendChild(main);

      const actions = el("div", "list-item-actions");
      const allFav = record.cards.every((c, i) => favKeys.has(favKeyOf(record.id, i)));
      const star = el("button", "icon-mini" + (allFav ? " is-on" : ""));
      star.type = "button";
      star.setAttribute("aria-label", "收藏整条记录");
      star.appendChild(makeIcon("star"));
      star.addEventListener("click", () => {
        if (allFav) {
          state.tarot.favorites = state.tarot.favorites.filter((f) => !String(f.key).startsWith(record.id + ":"));
        } else {
          record.cards.forEach((card, i) => {
            const key = favKeyOf(record.id, i);
            if (state.tarot.favorites.some((f) => f.key === key)) return;
            state.tarot.favorites.unshift({
              id: uid(), key, name: card.name, roman: card.roman, reversed: card.reversed,
              meaning: card.meaning, question: record.question, time: Date.now()
            });
          });
        }
        persist();
        renderTarot();
        renderMine();
        showToast(allFav ? "已取消收藏" : "已收藏这条记录", { icon: "star" });
      });
      const del = el("button", "icon-mini danger");
      del.type = "button";
      del.setAttribute("aria-label", "删除记录");
      del.appendChild(makeIcon("trash"));
      del.addEventListener("click", () => {
        openConfirm({
          icon: "trash", title: "删除这条抽卡记录？", sub: "收藏过的传讯不会一起消失。",
          confirmText: "删除", danger: true,
          onConfirm: () => {
            state.tarot.records = state.tarot.records.filter((r) => r.id !== record.id);
            persist();
            renderTarot();
            renderHome();
            showToast("记录已删除", { icon: "trash" });
          }
        });
      });
      actions.appendChild(star);
      actions.appendChild(del);
      item.appendChild(actions);
      frag.appendChild(item);
    });
    dom.tarotRecordList.replaceChildren(frag);
  }

  /* =======================================================
     23. 信箱
     ======================================================= */
  function showMailList() {
    ui.mailEditingId = null;
    dom.mailListView.hidden = false;
    dom.mailEditorView.hidden = true;
    dom.mailTitle.textContent = "信箱";
    dom.mailComposeBtn.hidden = false;
    renderMail();
  }

  function renderMail() {
    const letters = state.mail.letters.slice().sort((a, b) => b.updatedAt - a.updatedAt);
    if (!letters.length) {
      dom.mailList.replaceChildren(buildEmptySlot("envelope", "信箱里还没有信", "点右上角的加号，写下第一封想慢慢说的话。"));
      return;
    }
    const frag = document.createDocumentFragment();
    letters.forEach((letter) => {
      const item = el("div", "list-item");
      const main = el("button", "list-item-main");
      main.type = "button";
      main.style.textAlign = "left";
      main.appendChild(el("b", "", letter.title));
      main.appendChild(el("p", "", letter.body));
      main.appendChild(el("small", "", letter.from === "char"
        ? "来自 " + activeChar().name + " · " + formatDateTime(letter.updatedAt)
        : "最后修改 " + formatDateTime(letter.updatedAt)));
      main.addEventListener("click", () => openMailEditor(letter.id));
      item.appendChild(main);

      const actions = el("div", "list-item-actions");
      const edit = el("button", "icon-mini");
      edit.type = "button";
      edit.setAttribute("aria-label", "编辑");
      edit.appendChild(makeIcon("edit"));
      edit.addEventListener("click", () => openMailEditor(letter.id));
      const del = el("button", "icon-mini danger");
      del.type = "button";
      del.setAttribute("aria-label", "删除");
      del.appendChild(makeIcon("trash"));
      del.addEventListener("click", () => confirmDeleteLetter(letter));
      actions.appendChild(edit);
      actions.appendChild(del);
      item.appendChild(actions);
      frag.appendChild(item);
    });
    dom.mailList.replaceChildren(frag);
  }

  function openMailEditor(id) {
    const letter = id ? state.mail.letters.find((l) => l.id === id) : null;
    ui.mailEditingId = letter ? letter.id : null;
    dom.mailTitleInput.value = letter ? letter.title : "";
    dom.mailBodyInput.value = letter ? letter.body : "";
    dom.mailEditorMeta.textContent = letter
      ? "创建于 " + formatDateTime(letter.createdAt) + " · " + letter.body.length + " 字"
      : "新信件 · 最多 2000 字";
    dom.mailTitle.textContent = letter ? "编辑信件" : "写一封信";
    dom.mailListView.hidden = true;
    dom.mailEditorView.hidden = false;
    dom.mailComposeBtn.hidden = true;
    dom.mailEditorView.scrollTop = 0;
    setTimeout(() => dom.mailTitleInput.focus(), 200);
  }

  function saveMail() {
    const title = dom.mailTitleInput.value.trim().slice(0, 40);
    const body = dom.mailBodyInput.value.trim().slice(0, MAX_LETTER);
    // 基础校验：标题与正文都不能为空
    if (!title) {
      showToast("先给这封信起个名字吧", { icon: "envelope" });
      dom.mailTitleInput.focus();
      return;
    }
    if (!body) {
      showToast("信里还什么都没有写呢", { icon: "envelope" });
      dom.mailBodyInput.focus();
      return;
    }
    const now = Date.now();
    if (ui.mailEditingId) {
      const letter = state.mail.letters.find((l) => l.id === ui.mailEditingId);
      if (letter) {
        letter.title = title;
        letter.body = body;
        letter.updatedAt = now;
      }
      showToast("信件已更新", { icon: "check" });
    } else {
      state.mail.letters.push({ id: uid(), from: "me", title, body, createdAt: now, updatedAt: now });
      showToast("信已经收进信箱", { icon: "envelope" });
    }
    persist();
    showMailList();
    renderHome();
    renderMine();
  }

  function confirmDeleteLetter(letter) {
    openConfirm({
      icon: "trash", title: "删除这封信？", sub: "「" + letter.title + "」删除后无法找回。",
      confirmText: "删除", danger: true,
      onConfirm: () => {
        state.mail.letters = state.mail.letters.filter((l) => l.id !== letter.id);
        if (ui.mailEditingId === letter.id) showMailList();
        persist();
        renderMail();
        renderHome();
        renderMine();
        showToast("信件已删除", { icon: "trash" });
      }
    });
  }

  // 信箱页返回键：编辑中先回列表，否则退出子页面
  function handleMailBack() {
    if (!dom.mailEditorView.hidden) {
      showMailList();
      return;
    }
    closePage();
  }

  /* =======================================================
     24. 纪念日
     ======================================================= */
  function annTypeLabel(ann) {
    if (ann.type === "自定义") return ann.customType || "自定义";
    return ann.type;
  }

  // 排序：置顶优先，其次按日期先后
  function sortAnniversaries() {
    return state.anniversaries.slice().sort((a, b) => {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
      return a.date.localeCompare(b.date);
    });
  }

  function renderAnniversary() {
    const list = sortAnniversaries();
    if (!list.length) {
      dom.annList.replaceChildren(buildEmptySlot(
        "calendar",
        "还没有纪念日",
        "点右上角的加号，记下相遇、约定或任何一个只属于你们的日子。"
      ));
      return;
    }
    const frag = document.createDocumentFragment();
    list.forEach((ann) => {
      const diff = daysFromToday(ann.date);
      const card = el("article", "ann-card" + (ann.pinned ? " is-pinned" : ""));

      const count = el("div", "ann-count" + (diff === 0 ? " is-today" : ""));
      if (diff > 0) {
        count.appendChild(el("b", "", String(diff)));
        count.appendChild(el("small", "", "天后"));
      } else if (diff === 0) {
        count.appendChild(el("b", "", "今天"));
      } else {
        count.appendChild(el("b", "", String(Math.abs(diff))));
        count.appendChild(el("small", "", "天前"));
      }
      card.appendChild(count);

      const body = el("div", "ann-body");
      const nameRow = el("div", "ann-name");
      if (ann.pinned) nameRow.appendChild(el("span", "pin-dot", "★"));
      nameRow.appendChild(document.createTextNode(ann.name));
      body.appendChild(nameRow);
      const status = diff > 0 ? "还有 " + diff + " 天" : diff === 0 ? "就是今天" : "已过去 " + Math.abs(diff) + " 天";
      body.appendChild(el("p", "", formatDateLabel(ann.date) + " · " + annTypeLabel(ann)));
      body.appendChild(el("p", "", status));
      card.appendChild(body);

      const actions = el("div", "ann-actions");
      const pin = el("button", "icon-mini" + (ann.pinned ? " is-on" : ""));
      pin.type = "button";
      pin.setAttribute("aria-label", ann.pinned ? "取消置顶" : "置顶");
      pin.appendChild(makeIcon("pin"));
      pin.addEventListener("click", () => togglePin(ann.id));
      const edit = el("button", "icon-mini");
      edit.type = "button";
      edit.setAttribute("aria-label", "编辑");
      edit.appendChild(makeIcon("edit"));
      edit.addEventListener("click", () => openAnnModal(ann.id));
      const del = el("button", "icon-mini danger");
      del.type = "button";
      del.setAttribute("aria-label", "删除");
      del.appendChild(makeIcon("trash"));
      del.addEventListener("click", () => confirmDeleteAnn(ann));
      actions.appendChild(pin);
      actions.appendChild(edit);
      actions.appendChild(del);
      card.appendChild(actions);

      frag.appendChild(card);
    });
    dom.annList.replaceChildren(frag);
  }

  function togglePin(id) {
    const ann = state.anniversaries.find((a) => a.id === id);
    if (!ann) return;
    ann.pinned = !ann.pinned;
    persist();
    renderAnniversary();
    renderMine();
    showToast(ann.pinned ? "已置顶「" + ann.name + "」" : "已取消置顶", { icon: "pin" });
  }

  function openAnnModal(id) {
    const ann = id ? state.anniversaries.find((a) => a.id === id) : null;
    ui.annEditingId = ann ? ann.id : null;
    const types = ANN_TYPES.map((t) => '<option value="' + t + '"' + (ann && ann.type === t ? " selected" : "") + ">" + t + "</option>").join("");
    openModal({
      icon: "calendar",
      title: ann ? "编辑纪念日" : "新增纪念日",
      sub: "名称和日期都不能为空，日期越靠前越早显示。",
      body:
        '<label class="modal-field"><span>名称</span><input id="annName" type="text" maxlength="20" value="' + esc(ann ? ann.name : "") + '" placeholder="例如：第一次见面"></label>' +
        '<label class="modal-field"><span>日期</span><input id="annDate" type="date" value="' + (ann ? ann.date : todayISO()) + '"></label>' +
        '<label class="modal-field"><span>类型</span><select id="annType">' + types + "</select></label>" +
        '<label class="modal-field" id="annCustomWrap" style="display:none"><span>自定义类型</span><input id="annCustom" type="text" maxlength="10" value="' + esc(ann ? ann.customType : "") + '" placeholder="例如：旅行"></label>',
      confirmText: ann ? "保存修改" : "添加",
      onMount: (dialog) => {
        const typeSel = dialog.querySelector("#annType");
        const wrap = dialog.querySelector("#annCustomWrap");
        const sync = () => { wrap.style.display = typeSel.value === "自定义" ? "" : "none"; };
        typeSel.addEventListener("change", sync);
        sync();
      },
      onConfirm: (dialog) => {
        const name = dialog.querySelector("#annName").value.trim().slice(0, 20);
        const date = dialog.querySelector("#annDate").value;
        const type = dialog.querySelector("#annType").value;
        const customType = dialog.querySelector("#annCustom").value.trim().slice(0, 10);
        if (!name) {
          showToast("先写下这个日子叫什么吧", { icon: "calendar" });
          return false;
        }
        if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
          showToast("请选择一个有效的日期", { icon: "calendar" });
          return false;
        }
        if (type === "自定义" && !customType) {
          showToast("自定义类型也要写一个名字", { icon: "calendar" });
          return false;
        }
        if (ui.annEditingId) {
          const target = state.anniversaries.find((a) => a.id === ui.annEditingId);
          if (target) {
            target.name = name;
            target.date = date;
            target.type = type;
            target.customType = customType;
          }
          showToast("纪念日已更新", { icon: "check" });
        } else {
          state.anniversaries.push({ id: uid(), name, date, type, customType, pinned: false, createdAt: Date.now() });
          showToast("已经记下这个日子", { icon: "calendar" });
        }
        persist();
        renderAnniversary();
        renderHome();
        renderMine();
      }
    });
  }

  function confirmDeleteAnn(ann) {
    openConfirm({
      icon: "trash", title: "删除这个纪念日？", sub: "「" + ann.name + "」删除后无法找回。",
      confirmText: "删除", danger: true,
      onConfirm: () => {
        state.anniversaries = state.anniversaries.filter((a) => a.id !== ann.id);
        persist();
        renderAnniversary();
        renderHome();
        renderMine();
        showToast("纪念日已删除", { icon: "trash" });
      }
    });
  }

  /* =======================================================
     25. 音乐播放器
     ======================================================= */
  function currentTrack() {
    return state.music.tracks[state.music.state.index] || null;
  }

  /* ---------- 真实音频播放：全局唯一的 <audio> ---------- */
  // 注意：audioEl / trackSources 都是「运行期状态」，不会写进 localStorage。
  let audioEl = null;
  let pendingSeek = null;          // 元数据就绪后要恢复到的播放位置
  let playToken = 0;               // 快速切歌时用来丢弃过期的异步结果
  let playFailureNotified = false; // 每次播放尝试只提示一次失败，避免两个错误事件重复弹提示
  let lastPositionSave = 0;        // 播放进度节流持久化时间
  const trackSources = new Map();  // trackId -> 运行期 blob URL（本地音频）

  // 当前歌曲的有效时长：真实音频加载后以音频元数据为准，否则用记录里的时长
  function trackDuration(track) {
    if (!track) return 0;
    if (audioEl && audioEl.dataset.trackId === track.id
      && Number.isFinite(audioEl.duration) && audioEl.duration > 0) {
      return audioEl.duration;
    }
    return Number.isFinite(track.duration) && track.duration > 0 ? track.duration : 0;
  }

  // 时长未知时显示 --:--，避免让人误以为是 0 秒
  function formatTrackDuration(seconds) {
    return seconds > 0 ? formatDuration(seconds) : "--:--";
  }

  /* ---------- 本地音频的 IndexedDB 存取 ----------
     歌单元数据（名称 / 作者 / 索引 / 音量 / 模式）仍然写入 localStorage，
     但音频文件本身动辄几 MB，localStorage 只有约 5MB，直接塞进去会写失败。
     所以：≤1.2MB 的小文件转 dataURL 存 localStorage；更大的文件把 Blob
     存进 IndexedDB，localStorage 里只保留一个 storeKey 引用。 */
  const AUDIO_DB_NAME = "dream-card:audio";
  const AUDIO_STORE = "blobs";
  let audioDBPromise = null;

  function openAudioDB() {
    if (audioDBPromise) return audioDBPromise;
    audioDBPromise = new Promise((resolve) => {
      try {
        if (!window.indexedDB) { resolve(null); return; }
        const request = indexedDB.open(AUDIO_DB_NAME, 1);
        request.onupgradeneeded = () => {
          const db = request.result;
          if (!db.objectStoreNames.contains(AUDIO_STORE)) db.createObjectStore(AUDIO_STORE);
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => resolve(null);
        request.onblocked = () => resolve(null);
      } catch (error) {
        resolve(null);
      }
    });
    return audioDBPromise;
  }

  async function saveAudioBlob(key, blob) {
    const db = await openAudioDB();
    if (!db) return false;
    return new Promise((resolve) => {
      try {
        const tx = db.transaction(AUDIO_STORE, "readwrite");
        tx.objectStore(AUDIO_STORE).put(blob, key);
        tx.oncomplete = () => resolve(true);
        tx.onerror = () => resolve(false);
        tx.onabort = () => resolve(false);
      } catch (error) {
        resolve(false);
      }
    });
  }

  async function loadAudioBlob(key) {
    const db = await openAudioDB();
    if (!db) return null;
    return new Promise((resolve) => {
      try {
        const tx = db.transaction(AUDIO_STORE, "readonly");
        const request = tx.objectStore(AUDIO_STORE).get(key);
        request.onsuccess = () => resolve(request.result || null);
        request.onerror = () => resolve(null);
      } catch (error) {
        resolve(null);
      }
    });
  }

  async function removeAudioBlob(key) {
    const db = await openAudioDB();
    if (!db) return;
    try {
      const tx = db.transaction(AUDIO_STORE, "readwrite");
      tx.objectStore(AUDIO_STORE).delete(key);
    } catch (error) { /* 忽略 */ }
  }

  // 清空所有本地音频（一键清空缓存时调用）
  async function clearAudioStore() {
    const db = await openAudioDB();
    if (!db) return;
    try {
      await new Promise((resolve) => {
        const tx = db.transaction(AUDIO_STORE, "readwrite");
        tx.objectStore(AUDIO_STORE).clear();
        tx.oncomplete = resolve;
        tx.onerror = resolve;
        tx.onabort = resolve;
      });
    } catch (error) { /* 忽略 */ }
  }

  /* ---------- 播放源解析 ---------- */
  // 依次尝试：网络链接 → dataURL → IndexedDB 里的本地音频 → 本次会话的临时地址
  async function audioSourceOf(track) {
    if (!track) return "";
    if (track.kind === "url" && track.src) return track.src;
    if (track.dataUrl) return track.dataUrl;
    if (track.storeKey) {
      if (trackSources.has(track.id)) return trackSources.get(track.id);
      const blob = await loadAudioBlob(track.storeKey);
      if (!blob) return "";
      const url = URL.createObjectURL(blob);
      trackSources.set(track.id, url);
      return url;
    }
    return trackSources.get(track.id) || "";
  }

  function releaseTrackSource(track) {
    if (!track) return;
    const url = trackSources.get(track.id);
    if (url) {
      try { URL.revokeObjectURL(url); } catch (error) { /* 忽略 */ }
      trackSources.delete(track.id);
    }
  }

  function clearTrackSources() {
    trackSources.forEach((url) => {
      try { URL.revokeObjectURL(url); } catch (error) { /* 忽略 */ }
    });
    trackSources.clear();
  }

  // 初始化 <audio> 并绑定播放事件（只在第一次播放时执行）
  function ensureAudioEl() {
    if (audioEl) return audioEl;
    audioEl = new Audio();
    audioEl.preload = "metadata";
    audioEl.volume = clamp(state.music.state.volume / 100, 0, 1);

    // 播放进度：真实音频以 timeupdate 为准
    audioEl.addEventListener("timeupdate", () => {
      const track = currentTrack();
      if (!track || audioEl.dataset.trackId !== track.id) return;
      if (!ui.playing) return;
      const duration = trackDuration(track);
      const position = Number.isFinite(audioEl.currentTime) ? audioEl.currentTime : 0;
      state.music.state.position = position;
      if (!ui.seeking) {
        dom.playerCurrent.textContent = formatDuration(position);
        dom.playerDuration.textContent = formatTrackDuration(duration);
        dom.playerSeek.max = String(duration > 0 ? duration : 100);
        dom.playerSeek.value = String(clamp(position, 0, duration > 0 ? duration : 100));
        // 主页音乐小组件同步
        dom.miniTime.textContent = formatDuration(position) + " / " + formatDuration(duration);
        const percent = duration > 0 ? clamp((position / duration) * 100, 0, 100) : 0;
        dom.miniSeekFill.style.width = percent + "%";
      }
      // 每 5 秒记一次进度，刷新后可以接着听
      const now = Date.now();
      if (now - lastPositionSave > 5000) {
        lastPositionSave = now;
        persist();
      }
    });

    // 音频元数据就绪：补全时长、恢复上次播放位置
    audioEl.addEventListener("loadedmetadata", () => {
      const track = currentTrack();
      if (track && audioEl.dataset.trackId === track.id) {
        const duration = Number(audioEl.duration);
        if (Number.isFinite(duration) && duration > 0
          && Math.abs(duration - (track.duration || 0)) > 1) {
          track.duration = Math.round(duration);
          persist();
        }
        renderPlayer();
        refreshPlaylistViews();
      }
      if (pendingSeek !== null) {
        const max = Number.isFinite(audioEl.duration) && audioEl.duration > 0
          ? Math.max(0, audioEl.duration - 0.25)
          : pendingSeek;
        const target = clamp(pendingSeek, 0, max);
        pendingSeek = null;
        try { audioEl.currentTime = target; } catch (error) { /* 忽略 */ }
      }
    });

    // 播放结束：按播放模式决定重播 / 下一首
    audioEl.addEventListener("ended", () => {
      if (!ui.playing) return;
      if (state.music.state.mode === "one") {
        state.music.state.position = 0;
        try { audioEl.currentTime = 0; audioEl.play(); } catch (error) { /* 忽略 */ }
        return;
      }
      state.music.state.position = 0;
      playNext(true);
    });

    // 音频地址失效 / 文件丢失
    audioEl.addEventListener("error", () => {
      if (!audioEl.getAttribute("src")) return;
      const track = currentTrack();
      if (!track || audioEl.dataset.trackId !== track.id) return;
      ui.playing = false;
      haltPlayback(true);
      renderPlayer();
      refreshPlaylistViews();
      if (!playFailureNotified) {
        playFailureNotified = true;
        showToast("这首音频暂时无法播放，请检查链接是否可访问", { icon: "music", duration: 3200 });
      }
    });

    return audioEl;
  }

  // 把真实音频的当前进度同步回状态（切换梦角 / 暂停时调用）
  function syncPositionFromAudio() {
    if (!audioEl || !audioEl.dataset.trackId) return;
    if (Number.isFinite(audioEl.currentTime) && audioEl.currentTime >= 0) {
      state.music.state.position = audioEl.currentTime;
    }
  }

  // 停止播放（clearSrc=true 时同时释放当前音频地址）
  function haltPlayback(clearSrc) {
    // 让所有正在进行的异步播放请求失效，避免「刚暂停又被异步结果启动」
    playToken += 1;
    if (audioEl) {
      try { audioEl.pause(); } catch (error) { /* 忽略 */ }
      if (clearSrc) {
        try {
          audioEl.removeAttribute("src");
          audioEl.load();
        } catch (error) { /* 忽略 */ }
        try { delete audioEl.dataset.trackId; } catch (error) { /* 忽略 */ }
        pendingSeek = null;
      }
    }
    stopTone();
    stopMusicTimer();
  }

  // 切梦角前调用：先把进度写回旧梦角，再停下音乐
  function stopMusicForCharSwitch() {
    syncPositionFromAudio();
    ui.playing = false;
    haltPlayback(true);
    persist();
  }

  const MODE_META = {
    list: { icon: "repeat", label: "列表循环" },
    one: { icon: "repeat-one", label: "单曲循环" },
    shuffle: { icon: "shuffle", label: "随机播放" }
  };

  function renderPlayer() {
    const track = currentTrack();
    const ms = state.music.state;
    const duration = trackDuration(track);

    if (!track) {
      dom.playerTitle.textContent = "还没有歌曲";
      dom.playerArtist.textContent = "点「歌单管理」或右上角 + 添加";
      dom.playerSeek.value = "0";
      dom.playerSeek.max = "100";
      dom.playerSeek.disabled = true;
      dom.playerCurrent.textContent = "00:00";
      dom.playerDuration.textContent = "00:00";
    } else {
      dom.playerTitle.textContent = track.title;
      dom.playerArtist.textContent = track.artist;
      // 真实音频的时长要等元数据加载后才知道，未知时先禁用拖动
      dom.playerSeek.disabled = duration <= 0;
      dom.playerSeek.max = String(duration > 0 ? duration : 100);
      if (!ui.seeking) {
        dom.playerSeek.value = String(clamp(ms.position, 0, duration > 0 ? duration : 100));
      }
      dom.playerCurrent.textContent = formatDuration(ms.position);
      dom.playerDuration.textContent = formatTrackDuration(duration);
    }

    // 播放 / 暂停图标
    dom.playerPlay.replaceChildren(makeIcon(ui.playing ? "pause" : "play"));
    dom.playerArt.classList.toggle("is-spinning", ui.playing && !!track);

    // 播放模式图标
    const mode = MODE_META[ms.mode] || MODE_META.list;
    dom.playerMode.replaceChildren(makeIcon(mode.icon));
    dom.playerMode.setAttribute("aria-label", "播放模式：" + mode.label);
    dom.playerMode.classList.toggle("is-on", ms.mode !== "list");

    // 音量（同时同步到真实音频）
    dom.playerVolume.value = String(ms.volume);
    dom.playerVolumeLabel.textContent = ms.volume + "%";
    if (audioEl) audioEl.volume = clamp(ms.volume / 100, 0, 1);

    // 播放器上的「歌单管理」入口顺便显示歌曲数量
    const manageLabel = dom.openPlaylistBtn ? dom.openPlaylistBtn.querySelector("span") : null;
    if (manageLabel) manageLabel.textContent = "歌单管理" + (state.music.tracks.length ? " · " + state.music.tracks.length : "");

    // 底部说明：区分真实音频 / 演示音源 / 已失效的本地文件
    if (!track) {
      dom.playerNote.textContent = "支持音频链接与本地文件，歌单会跟随当前梦角独立保存。";
    } else if (track.kind === "demo") {
      dom.playerNote.textContent = "演示音源：这首没有真实音频，播放时会响起一段轻柔的合成旋律。";
    } else if (track.kind === "file" && !track.dataUrl && !track.storeKey && !trackSources.has(track.id)) {
      dom.playerNote.textContent = "本地音频已失效（可能被浏览器清理），可以删除后重新导入。";
    } else if (track.kind === "file") {
      dom.playerNote.textContent = "本地音频播放 · 支持拖动进度条与音量调节。";
    } else {
      dom.playerNote.textContent = "网络音频播放 · 支持拖动进度条与音量调节。";
    }

    // 主页里的音乐小组件同步刷新
    renderMiniPlayer();
  }

  // 歌单为空时的引导卡片（添加按钮直接打开「添加音乐」弹窗）
  function buildMusicEmpty(fromManager) {
    const box = el("div", "empty-slot music-empty");
    box.appendChild(makeIcon("music"));
    box.appendChild(el("b", "", "歌单还是空的"));
    box.appendChild(el("p", "", "把喜欢的歌加进来吧，支持音频链接或本地文件。"));
    const add = el("button", "small-primary", "＋ 添加音乐");
    add.type = "button";
    add.addEventListener("click", () => openAddTrackModal(Boolean(fromManager)));
    box.appendChild(add);
    return box;
  }

  // 把歌曲列表渲染到指定容器（页面歌单 / 歌单管理弹窗共用）
  function renderTrackListInto(container, options) {
    if (!container) return;
    const opts = options || {};
    const tracks = state.music.tracks;
    if (!tracks.length) {
      container.replaceChildren(buildMusicEmpty(opts.fromManager));
      return;
    }
    const index = state.music.state.index;
    const frag = document.createDocumentFragment();
    tracks.forEach((track, i) => {
      const item = el("div", "list-item" + (i === index ? " is-playing" : ""));
      item.appendChild(el("span", "track-index", i === index && ui.playing ? "▶" : String(i + 1)));

      const main = el("button", "list-item-main");
      main.type = "button";
      main.style.textAlign = "left";
      main.appendChild(el("b", "", track.title));
      const duration = trackDuration(track);
      const meta = [track.artist, duration > 0 ? formatDuration(duration) : "时长待读取"];
      if (track.kind === "file") meta.push(track.sessionOnly ? "本地 · 仅本次" : "本地音频");
      else if (track.kind === "demo") meta.push("演示");
      main.appendChild(el("small", "", meta.join(" · ")));
      main.addEventListener("click", () => {
        setTrack(i, true);
        showToast("正在播放《" + track.title + "》", { icon: "music", duration: 1600 });
      });
      item.appendChild(main);

      const actions = el("div", "list-item-actions");
      const edit = el("button", "icon-mini");
      edit.type = "button";
      edit.setAttribute("aria-label", "编辑歌曲");
      edit.appendChild(makeIcon("edit"));
      edit.addEventListener("click", () => openTrackModal(track.id, Boolean(opts.fromManager)));
      const del = el("button", "icon-mini danger");
      del.type = "button";
      del.setAttribute("aria-label", "删除歌曲");
      del.appendChild(makeIcon("trash"));
      del.addEventListener("click", () => confirmDeleteTrack(track, Boolean(opts.fromManager)));
      actions.appendChild(edit);
      actions.appendChild(del);
      item.appendChild(actions);
      frag.appendChild(item);
    });
    container.replaceChildren(frag);
  }

  // 歌单管理弹窗里的列表节点（弹窗打开时才存在）
  let playlistModalList = null;

  // 同时刷新页面歌单、歌单管理弹窗与「我的」数据概览
  function refreshPlaylistViews() {
    renderPlaylist();
    if (playlistModalList && playlistModalList.isConnected) {
      renderTrackListInto(playlistModalList, { fromManager: true });
      const manager = playlistModalList.closest(".playlist-manager");
      const count = manager ? manager.querySelector(".playlist-manager-count") : null;
      if (count) count.textContent = "共 " + state.music.tracks.length + " 首 · 点击歌曲播放";
    }
    renderMine();
  }

  function renderPlaylist() {
    const tracks = state.music.tracks;
    dom.playlistCount.textContent = tracks.length + " 首";
    renderTrackListInto(dom.playlist, { fromManager: false });
  }

  /* ---------- 歌单管理弹窗 ---------- */
  function openPlaylistModal() {
    const body = el("div", "playlist-manager");
    const head = el("div", "playlist-manager-head");
    head.appendChild(el("b", "", "全部歌曲"));
    head.appendChild(el("small", "playlist-manager-count",
      "共 " + state.music.tracks.length + " 首 · 点击歌曲播放"));
    body.appendChild(head);

    const list = el("div", "playlist-modal-list");
    playlistModalList = list;
    body.appendChild(list);
    renderTrackListInto(list, { fromManager: true });

    // 两种添加方式的快捷入口
    const actions = el("div", "playlist-manager-actions");
    const addLink = el("button", "ghost-btn");
    addLink.type = "button";
    addLink.appendChild(makeIcon("plus"));
    addLink.appendChild(el("span", "", "链接添加"));
    addLink.addEventListener("click", () => openAddTrackModal(true));

    const addFile = el("button", "ghost-btn");
    addFile.type = "button";
    addFile.appendChild(makeIcon("upload"));
    addFile.appendChild(el("span", "", "本地导入"));
    addFile.addEventListener("click", () => pickAudioFile("manager"));
    actions.appendChild(addLink);
    actions.appendChild(addFile);
    body.appendChild(actions);

    const done = el("button", "text-btn playlist-manager-done", "完成");
    done.type = "button";
    done.addEventListener("click", closeModal);
    body.appendChild(done);

    openModal({
      icon: "list",
      title: "歌单管理",
      sub: "歌单跟随当前梦角独立保存，切换梦角会自动切换歌单。",
      body,
      footer: false
    });
  }

  /* ---------- 播放控制 ---------- */
  // 播放当前歌曲（真实音频优先，没有音源时回退到离线合成旋律）
  async function playCurrentTrack() {
    const track = currentTrack();
    if (!track) return;
    const token = ++playToken;
    let src = "";
    try {
      src = await audioSourceOf(track);
    } catch (error) {
      src = "";
    }
    // 异步读取 IndexedDB 期间用户可能已经切歌，丢弃过期结果
    if (token !== playToken) return;
    const still = currentTrack();
    if (!still || still.id !== track.id) return;
    // 异步读取期间用户点了暂停：不要再启动音源
    if (!ui.playing) return;
    playFailureNotified = false;

    if (!src) {
      // 本地文件失效（刷新后 IndexedDB 被清理 / 本次会话临时地址丢失）
      if (track.kind === "file") {
        ui.playing = false;
        haltPlayback(true);
        showToast("本地音频已失效，请删除后重新导入", { icon: "music", duration: 3200 });
        renderPlayer();
        refreshPlaylistViews();
        return;
      }
      // 演示曲目：沿用原来的离线合成旋律
      startTone();
      startMusicTimer();
      renderPlayer();
      refreshPlaylistViews();
      return;
    }

    stopTone();
    stopMusicTimer();
    const audio = ensureAudioEl();
    const sameSource = audio.dataset.trackId === track.id
      && audio.getAttribute("src") === src;
    if (!sameSource) {
      // 换歌（或首次播放）：等元数据加载后再恢复到记录的位置
      audio.dataset.trackId = track.id;
      audio.src = src;
      pendingSeek = Math.max(0, state.music.state.position || 0);
      try { audio.load(); } catch (error) { /* 忽略 */ }
    } else if (audio.ended) {
      // 已经播放结束的音频，再点播放时从头开始
      try { audio.currentTime = 0; } catch (error) { /* 忽略 */ }
      state.music.state.position = 0;
    }
    audio.volume = clamp(state.music.state.volume / 100, 0, 1);
    try {
      await audio.play();
      if (token !== playToken) {
        // 播放请求返回前又切了歌，暂停这条过期的音频
        try { audio.pause(); } catch (error) { /* 忽略 */ }
        return;
      }
      ui.playing = true;
    } catch (error) {
      ui.playing = false;
      // 音频加载失败时 error 事件也会触发；用同一次尝试的标记保证只提示一次
      if (!playFailureNotified) {
        playFailureNotified = true;
        showToast(
          error && error.name === "NotAllowedError"
            ? "浏览器拦截了自动播放，点一下播放键试试"
            : "这首音频暂时无法播放，请检查链接是否可访问",
          { icon: "music", duration: 3000 }
        );
      }
    }
    renderPlayer();
    refreshPlaylistViews();
  }

  // 切换歌曲（autoplay=true 时立即播放）
  function setTrack(index, autoplay) {
    const tracks = state.music.tracks;
    if (!tracks.length) return;
    const next = ((index % tracks.length) + tracks.length) % tracks.length;
    state.music.state.index = next;
    state.music.state.position = 0;
    if (autoplay) ui.playing = true;
    haltPlayback(true);
    persist();
    if (ui.playing) playCurrentTrack();
    renderPlayer();
    refreshPlaylistViews();
    renderHome();
  }

  function togglePlay() {
    if (!currentTrack()) {
      showToast("先添加一首歌吧", { icon: "music" });
      return;
    }
    if (ui.playing) {
      // 暂停：记录真实音频的进度后停下
      syncPositionFromAudio();
      ui.playing = false;
      haltPlayback(false);
      persist();
      renderPlayer();
      refreshPlaylistViews();
      return;
    }
    ui.playing = true;
    playCurrentTrack();
    renderPlayer();
    refreshPlaylistViews();
  }

  function playNext(auto) {
    const tracks = state.music.tracks;
    if (!tracks.length) return;
    let next;
    if (state.music.state.mode === "shuffle" && tracks.length > 1) {
      do { next = Math.floor(Math.random() * tracks.length); } while (next === state.music.state.index);
    } else {
      next = (state.music.state.index + 1) % tracks.length;
    }
    state.music.state.index = next;
    state.music.state.position = 0;
    haltPlayback(true);
    persist();
    if (ui.playing) playCurrentTrack();
    renderPlayer();
    refreshPlaylistViews();
    renderHome();
    if (!auto) showToast("已切到下一首", { icon: "next", duration: 1500 });
  }

  function playPrev() {
    const tracks = state.music.tracks;
    const track = currentTrack();
    if (!tracks.length || !track) return;
    // 播放超过 5 秒时，先回到本首开头（真实音频以音频进度为准）
    let position = state.music.state.position;
    if (audioEl && audioEl.dataset.trackId === track.id && Number.isFinite(audioEl.currentTime)) {
      position = audioEl.currentTime;
    }
    if (position > 5) {
      state.music.state.position = 0;
      if (audioEl && audioEl.dataset.trackId === track.id) {
        try { audioEl.currentTime = 0; } catch (error) { /* 忽略 */ }
      }
      persist();
      renderPlayer();
      return;
    }
    const prev = (state.music.state.index - 1 + tracks.length) % tracks.length;
    state.music.state.index = prev;
    state.music.state.position = 0;
    haltPlayback(true);
    persist();
    if (ui.playing) playCurrentTrack();
    renderPlayer();
    refreshPlaylistViews();
    renderHome();
    showToast("已切到上一首", { icon: "prev", duration: 1500 });
  }

  function cycleMode() {
    const order = PLAY_MODES;
    const i = order.indexOf(state.music.state.mode);
    state.music.state.mode = order[(i + 1) % order.length];
    persist();
    renderPlayer();
    showToast("播放模式：" + MODE_META[state.music.state.mode].label, { icon: "repeat", duration: 1800 });
  }

  // 演示曲目的模拟进度（真实音频由 timeupdate 驱动，不会走这里）
  function startMusicTimer() {
    stopMusicTimer();
    ui.musicTimer = setInterval(() => {
      // 暂停时计时器可能还没来得及清理，这里再兜底一次
      if (!ui.playing) return;
      const track = currentTrack();
      if (!track) return;
      const duration = track.duration > 0 ? track.duration : 210;
      state.music.state.position += 0.2;
      if (state.music.state.position >= duration) {
        // 播放结束，按模式决定下一首
        if (state.music.state.mode === "one") {
          state.music.state.position = 0;
        } else {
          state.music.state.position = 0;
          playNext(true);
          return;
        }
      }
      if (!ui.seeking) {
        dom.playerSeek.value = String(state.music.state.position);
        dom.playerCurrent.textContent = formatDuration(state.music.state.position);
        dom.miniTime.textContent = formatDuration(state.music.state.position) + " / " + formatDuration(duration);
        const percent = clamp((state.music.state.position / duration) * 100, 0, 100);
        dom.miniSeekFill.style.width = percent + "%";
      }
      const now = Date.now();
      if (now - lastPositionSave > 5000) {
        lastPositionSave = now;
        persist();
      }
    }, 200);
  }

  function stopMusicTimer() {
    if (ui.musicTimer) clearInterval(ui.musicTimer);
    ui.musicTimer = null;
  }

  /* ---------- 离线合成音源（Web Audio，失败时静默） ---------- */
  let audioCtx = null;
  let masterGain = null;
  let noteTimer = null;

  function ensureAudio() {
    if (audioCtx) return audioCtx;
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return null;
    try {
      audioCtx = new Ctx();
      masterGain = audioCtx.createGain();
      masterGain.gain.value = 0;
      masterGain.connect(audioCtx.destination);
    } catch (error) {
      audioCtx = null;
      masterGain = null;
    }
    return audioCtx;
  }

  function applyVolume() {
    if (!masterGain) return;
    try {
      masterGain.gain.value = (state.music.state.volume / 100) * 0.16;
    } catch (error) {
      // 忽略
    }
  }

  const NOTE_SCALE = [0, 2, 4, 7, 9, 12, 14, 16];

  function playNote() {
    if (!audioCtx || !masterGain) return;
    try {
      const t = audioCtx.currentTime;
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      const base = 220 * Math.pow(2, ((state.music.state.index % 5) - 2) / 12);
      const semi = NOTE_SCALE[Math.floor(Math.random() * NOTE_SCALE.length)];
      osc.type = "sine";
      osc.frequency.value = base * Math.pow(2, semi / 12);
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.5, t + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 1.8);
      osc.connect(gain);
      gain.connect(masterGain);
      osc.start(t);
      osc.stop(t + 1.9);
    } catch (error) {
      // 忽略音频错误
    }
  }

  function startTone() {
    const ctx = ensureAudio();
    if (!ctx) return;
    try {
      if (ctx.state === "suspended") ctx.resume();
    } catch (error) { /* 忽略 */ }
    applyVolume();
    if (noteTimer) clearInterval(noteTimer);
    playNote();
    noteTimer = setInterval(playNote, 640);
  }

  function stopTone() {
    if (noteTimer) clearInterval(noteTimer);
    noteTimer = null;
    if (masterGain) {
      try { masterGain.gain.value = 0; } catch (error) { /* 忽略 */ }
    }
  }

  /* ---------- 歌单增删改 ---------- */
  // 构造一个带标题的输入框
  function buildTrackField(labelText, attrs) {
    const input = document.createElement("input");
    input.type = attrs && attrs.type ? attrs.type : "text";
    input.autocomplete = "off";
    if (attrs && attrs.placeholder) input.placeholder = attrs.placeholder;
    if (attrs && attrs.maxlength) input.maxLength = attrs.maxlength;
    if (attrs && attrs.value) input.value = attrs.value;
    const label = el("label", "modal-field");
    label.appendChild(el("span", "", labelText));
    label.appendChild(input);
    return { label, input };
  }

  // 把一首歌追加到当前梦角的歌单。
  // 返回 { added, saved }：added=是否真的加入（歌单可能已满），saved=是否成功写入 localStorage。
  function appendTrack(track, options) {
    const opts = options || {};
    if (state.music.tracks.length >= MAX_TRACKS) {
      showToast("这个梦角的歌单已经满了（最多 " + MAX_TRACKS + " 首）", { icon: "music" });
      return { added: false, saved: false };
    }
    const wasEmpty = !state.music.tracks.length;
    state.music.tracks.push(track);
    if (wasEmpty) {
      state.music.state.index = 0;
      state.music.state.position = 0;
    }
    const saved = persist(opts.silent ? { silent: true } : undefined);
    renderPlayer();
    refreshPlaylistViews();
    renderHome();
    return { added: true, saved };
  }

  /* ---------- 添加音乐：方式 A 链接录入 / 方式 B 本地文件 ---------- */
  function openAddTrackModal(fromManager) {
    const body = el("div", "add-music");

    // 方式 A：链接录入
    const methodA = el("section", "add-method");
    const headA = el("div", "add-method-head");
    headA.appendChild(el("span", "add-method-mark", "A"));
    const copyA = el("div", "add-method-copy");
    copyA.appendChild(el("b", "", "链接添加"));
    copyA.appendChild(el("small", "", "填写歌曲名称、作者与音频地址"));
    headA.appendChild(copyA);
    methodA.appendChild(headA);

    const titleField = buildTrackField("歌曲名称 *", { placeholder: "例如：水星记", maxlength: MAX_TRACK_TITLE });
    const artistField = buildTrackField("作者", { placeholder: "例如：郭顶（可留空）", maxlength: MAX_TRACK_ARTIST });
    const urlField = buildTrackField("音频链接 *", { type: "url", placeholder: "https://.../song.mp3", maxlength: 2000 });
    methodA.appendChild(titleField.label);
    methodA.appendChild(artistField.label);
    methodA.appendChild(urlField.label);

    const submitLink = el("button", "small-primary add-method-btn", "添加到歌单");
    submitLink.type = "button";
    submitLink.addEventListener("click", () => {
      const title = titleField.input.value.trim();
      if (!title) {
        showToast("歌曲名称不能为空", { icon: "close" });
        titleField.input.focus();
        return;
      }
      const url = urlField.input.value.trim();
      if (!isAudioUrl(url)) {
        showToast("请输入有效的音频链接（http / https）", { icon: "close" });
        urlField.input.focus();
        return;
      }
      const track = {
        id: uid(),
        title: title.slice(0, MAX_TRACK_TITLE),
        artist: (artistField.input.value.trim() || "未知").slice(0, MAX_TRACK_ARTIST),
        kind: "url",
        src: url,
        dataUrl: "",
        storeKey: "",
        sessionOnly: false,
        duration: 0,          // 时长等音频元数据加载后自动补全
        createdAt: Date.now()
      };
      const result = appendTrack(track);
      if (!result.added) return;
      closeModal();
      if (fromManager) setTimeout(openPlaylistModal, 80);
      showToast("已加入歌单《" + track.title + "》", { icon: "music" });
    });
    methodA.appendChild(submitLink);
    body.appendChild(methodA);

    const divider = el("div", "add-or");
    divider.appendChild(el("span", "", "或"));
    body.appendChild(divider);

    // 方式 B：本地音频
    const methodB = el("section", "add-method");
    const headB = el("div", "add-method-head");
    headB.appendChild(el("span", "add-method-mark", "B"));
    const copyB = el("div", "add-method-copy");
    copyB.appendChild(el("b", "", "本地音频"));
    copyB.appendChild(el("small", "", "自动读取文件名作为歌曲名"));
    headB.appendChild(copyB);
    methodB.appendChild(headB);

    const pickBtn = el("button", "add-file-btn");
    pickBtn.type = "button";
    pickBtn.appendChild(makeIcon("upload"));
    pickBtn.appendChild(el("span", "", "选择本地音频文件"));
    pickBtn.appendChild(el("small", "", "支持 mp3 / wav / m4a / ogg 等，最大 60MB"));
    pickBtn.addEventListener("click", () => pickAudioFile(fromManager ? "addManager" : "addPage"));
    methodB.appendChild(pickBtn);
    body.appendChild(methodB);

    const closeBtn = el("button", "text-btn add-close-btn", "关闭");
    closeBtn.type = "button";
    closeBtn.addEventListener("click", closeModal);
    body.appendChild(closeBtn);

    openModal({
      icon: "music",
      title: "添加音乐",
      sub: fromManager ? "添加完成后会回到歌单管理。" : "支持网络音频链接，也可以直接导入本地音频。",
      body,
      footer: false
    });
  }

  // 打开系统文件选择器；returnTo 决定导入完成后回到哪个界面
  function pickAudioFile(returnTo) {
    if (ui.musicBusy) return;
    ui.musicImportReturn = returnTo || "addPage";
    try {
      dom.musicFileInput.value = "";
      dom.musicFileInput.click();
    } catch (error) {
      showToast("当前浏览器无法打开文件选择器", { icon: "close" });
    }
  }

  // 读取本地文件为 dataURL（仅用于 ≤1.2MB 的小音频）
  function readFileAsDataUrl(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ""));
      reader.onerror = () => reject(reader.error || new Error("read failed"));
      reader.readAsDataURL(file);
    });
  }

  // 用一个临时 <audio> 读取时长，失败就返回 0（之后播放时还能补）
  function probeAudioDuration(file) {
    return new Promise((resolve) => {
      let settled = false;
      let probe = null;
      let url = "";
      const finish = (value) => {
        if (settled) return;
        settled = true;
        if (probe) {
          try { probe.removeAttribute("src"); probe.load(); } catch (error) { /* 忽略 */ }
        }
        if (url) { try { URL.revokeObjectURL(url); } catch (error) { /* 忽略 */ } }
        resolve(value);
      };
      try {
        probe = new Audio();
        url = URL.createObjectURL(file);
        probe.preload = "metadata";
        probe.onloadedmetadata = () => {
          finish(Number.isFinite(probe.duration) ? probe.duration : 0);
        };
        probe.onerror = () => finish(0);
        probe.src = url;
      } catch (error) {
        finish(0);
      }
      setTimeout(() => finish(0), 5000);
    });
  }

  function fileNameToTitle(name) {
    let base = String(name || "").split(/[\\/]/).pop() || "";
    base = base.replace(/\.(mp3|wav|m4a|aac|ogg|oga|flac|opus|webm|wma)$/i, "");
    base = base.replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim();
    return base.slice(0, MAX_TRACK_TITLE) || "本地音频";
  }

  function isAudioFile(file) {
    if (!file) return false;
    if (/^audio\//i.test(file.type || "")) return true;
    return /\.(mp3|wav|m4a|aac|ogg|oga|flac|opus|webm|wma)$/i.test(file.name || "");
  }

  // 基础 URL 校验：允许 http(s)、data:audio，以及站内相对路径
  function isAudioUrl(value) {
    const url = String(value || "").trim();
    if (!url) return false;
    if (/^data:audio\//i.test(url)) return true;
    if (/^\.{0,2}\//.test(url)) return true;
    try {
      const parsed = new URL(url);
      return parsed.protocol === "http:" || parsed.protocol === "https:";
    } catch (error) {
      return false;
    }
  }

  // 导入本地音频：小文件进 localStorage，大文件进 IndexedDB
  async function importLocalAudio(file, returnTo) {
    if (!file || ui.musicBusy) return;
    if (!isAudioFile(file)) {
      showToast("请选择音频文件（mp3 / wav / m4a 等）", { icon: "music" });
      return;
    }
    if (file.size > MAX_AUDIO_FILE) {
      showToast("音频文件太大了，请选择 60MB 以内的文件", { icon: "close" });
      return;
    }

    ui.musicBusy = true;
    showToast("正在读取音频…", { icon: "music", duration: 1600 });
    try {
      const duration = await probeAudioDuration(file);
      const track = {
        id: uid(),
        title: fileNameToTitle(file.name),
        artist: "本地音频",
        kind: "file",
        src: "",
        dataUrl: "",
        storeKey: "",
        sessionOnly: false,
        duration: clamp(Math.round(duration), 0, 60 * 60),
        createdAt: Date.now()
      };

      // 第一步：决定音频存到哪里
      if (file.size <= LOCAL_DATAURL_LIMIT) {
        try {
          track.dataUrl = await readFileAsDataUrl(file);
        } catch (error) {
          track.dataUrl = "";
        }
      }
      if (!track.dataUrl) {
        const key = "audio:" + track.id;
        const stored = await saveAudioBlob(key, file);
        if (stored) {
          track.storeKey = key;
        } else {
          // IndexedDB 不可用（例如某些浏览器以 file:// 打开页面）：
          // 生成 blob 地址，本次打开期间能播放，刷新后需要重新导入
          track.sessionOnly = true;
          trackSources.set(track.id, URL.createObjectURL(file));
        }
      }

      // 第二步：加入歌单并写入 localStorage
      const result = appendTrack(track, { silent: true });
      if (!result.added) {
        // 歌单已满：清理刚写入 IndexedDB / 临时地址的音频，避免留下孤儿数据
        releaseTrackSource(track);
        if (track.storeKey) removeAudioBlob(track.storeKey);
        return;
      }
      let saved = result.saved;

      // 第三步：若 dataURL 撑爆了 localStorage，就把音频挪到 IndexedDB 再存一次
      if (!saved && track.dataUrl) {
        track.dataUrl = "";
        const key = "audio:" + track.id;
        const stored = await saveAudioBlob(key, file);
        if (stored) {
          track.storeKey = key;
        } else {
          track.sessionOnly = true;
          trackSources.set(track.id, URL.createObjectURL(file));
        }
        saved = persist({ silent: true });
        renderPlayer();
      }
      if (!saved) {
        // 再试一次普通持久化，让存储不足的提示有机会出现
        saved = persist();
      }

      // 回到合适的界面
      if (returnTo === "addPage") {
        closeModal();
      } else if (returnTo === "addManager") {
        closeModal();
        setTimeout(openPlaylistModal, 80);
      }
      // returnTo === "manager" 时管理器还开着，上面的刷新已经更新了列表

      showToast("已加入歌单《" + track.title + "》" + (track.sessionOnly ? "（仅本次有效）" : ""), {
        icon: "music",
        duration: 2400
      });
    } catch (error) {
      showToast("音频读取失败，请换个文件试试", { icon: "close" });
    } finally {
      ui.musicBusy = false;
    }
  }

  /* ---------- 编辑歌曲 ---------- */
  function openTrackModal(id, fromManager) {
    const track = id ? state.music.tracks.find((t) => t.id === id) : null;
    if (!track) return;

    const body = el("div", "track-edit");
    const titleField = buildTrackField("歌曲名称 *", {
      value: track.title, maxlength: MAX_TRACK_TITLE, placeholder: "例如：水星记"
    });
    const artistField = buildTrackField("作者", {
      value: track.artist, maxlength: MAX_TRACK_ARTIST, placeholder: "例如：郭顶"
    });
    body.appendChild(titleField.label);
    body.appendChild(artistField.label);

    // 网络音频允许顺便修正链接；本地文件不可改源
    let urlField = null;
    if (track.kind === "url") {
      urlField = buildTrackField("音频链接", {
        type: "url", value: track.src, maxlength: 2000, placeholder: "https://.../song.mp3"
      });
      body.appendChild(urlField.label);
    } else {
      const hint = el("p", "form-hint", track.kind === "demo"
        ? "这是没有音源的演示曲目。可以删除后添加真实音频，或继续使用演示旋律。"
        : "本地音频文件不能在这里替换；如需更换，请删除后重新导入。");
      body.appendChild(hint);
    }

    openModal({
      icon: "music",
      title: "编辑歌曲",
      sub: "修改歌曲名称与作者；同名歌曲可以共存。",
      body,
      confirmText: "保存修改",
      onConfirm: () => {
        const title = titleField.input.value.trim();
        if (!title) {
          showToast("歌曲名称不能为空", { icon: "close" });
          titleField.input.focus();
          return false;
        }
        let nextSrc = track.src;
        if (urlField) {
          const url = urlField.input.value.trim();
          if (!isAudioUrl(url)) {
            showToast("请输入有效的音频链接（http / https）", { icon: "close" });
            urlField.input.focus();
            return false;
          }
          nextSrc = url;
        }
        const sourceChanged = urlField && nextSrc !== track.src;
        track.title = title.slice(0, MAX_TRACK_TITLE);
        track.artist = (artistField.input.value.trim() || "未知").slice(0, MAX_TRACK_ARTIST);
        if (urlField) track.src = nextSrc;
        persist();
        // 正在播放这首歌且换了链接：重新加载
        if (sourceChanged && currentTrack() && currentTrack().id === track.id && ui.playing) {
          haltPlayback(true);
          playCurrentTrack();
        }
        renderPlayer();
        refreshPlaylistViews();
        showToast("歌曲信息已更新", { icon: "check" });
        if (fromManager) setTimeout(openPlaylistModal, 80);
      }
    });
  }

  /* ---------- 删除歌曲（二次确认） ---------- */
  function confirmDeleteTrack(track, fromManager) {
    const isLocal = track.kind === "file";
    openConfirm({
      icon: "trash",
      title: "从歌单移除这首歌？",
      sub: "《" + track.title + "》" + (isLocal ? "的本地音频也会一并移除。" : "移除后可以重新添加。"),
      confirmText: "移除",
      danger: true,
      onConfirm: async () => {
        const wasCurrent = currentTrack() && currentTrack().id === track.id;
        const wasPlaying = ui.playing;
        const index = state.music.tracks.findIndex((t) => t.id === track.id);

        // 释放本地资源（blob URL / IndexedDB）
        releaseTrackSource(track);
        if (track.storeKey) removeAudioBlob(track.storeKey);

        state.music.tracks = state.music.tracks.filter((t) => t.id !== track.id);
        if (!state.music.tracks.length) {
          ui.playing = false;
          haltPlayback(true);
          state.music.state.index = 0;
          state.music.state.position = 0;
        } else {
          // 删除位置在当前歌曲之前时，索引整体前移
          if (index > -1 && index < state.music.state.index) {
            state.music.state.index -= 1;
          }
          state.music.state.index = clamp(state.music.state.index, 0, state.music.tracks.length - 1);
          if (wasCurrent) {
            state.music.state.position = 0;
            haltPlayback(true);
            // 原来正在播放：自动接着播放同位置的那首
            if (wasPlaying) {
              ui.playing = true;
              playCurrentTrack();
            }
          }
        }
        persist();
        renderPlayer();
        refreshPlaylistViews();
        renderHome();
        showToast("已从歌单移除", { icon: "trash" });
        if (fromManager) setTimeout(openPlaylistModal, 80);
      }
    });
  }

  /* =======================================================
     26. 一键清空全部本地缓存
     ======================================================= */
  function resetAllData() {
    // 中止聊天与音乐的各项计时
    ui.sessionVersion += 1;
    ui.replyQueue = [];
    cancelCurrentDelay();
    ui.typing = false;
    ui.playing = false;
    // 停掉真实音频 / 演示旋律，并清空本地音频缓存
    haltPlayback(true);
    clearTrackSources();
    clearAudioStore();
    ui.musicBusy = false;

    try {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(LEGACY_V2_KEY);
      localStorage.removeItem(LEGACY_KEY);
    } catch (error) { /* 忽略 */ }

    const fresh = defaultState();
    Object.keys(state).forEach((key) => { delete state[key]; });
    Object.assign(state, fresh);
    // 数据整块换掉之后，重新接管「多梦角数据代理」
    attachCharProxies(state);

    // 运行期状态复位
    ui.tab = "home";
    ui.pageStack = [];
    ui.quoteDraft = null;
    ui.mailEditingId = null;
    ui.annEditingId = null;
    ui.diaryEditingId = null;
    ui.calEditingId = null;
    ui.tarotFilter = false;
    ui.momentImage = "";
    ui.calCursor = new Date();
    ui.calSelected = todayISO();
    closeCharPanel();

    applyPrefs();
    persist();
    // 全部重新渲染
    renderHeader();
    renderMessages({ forceScroll: true });
    renderHome();
    renderSettingsTab();
    renderMine();
    renderCards();
    renderTarot();
    renderMail();
    renderAnniversary();
    renderMoments();
    renderDiary();
    renderCalendar();
    renderStats();
    renderPlaylist();
    renderPlayer();
    updateMomentThumb();
    switchTab("home");
    showToast("本地缓存已全部清空", { icon: "check", duration: 2600 });
  }

  /* =======================================================
     27. 事件绑定
     ======================================================= */
  let pressTimer = null;
  let pressedBubble = null;
  let pressOrigin = null;

  function bindEvents() {
    // ---- 底部固定导航：主页面 / 设置 / 我的 ----
    dom.navItems.forEach((btn) => {
      btn.addEventListener("click", () => {
        // 切换 Tab 时关闭所有子页面，回到该 Tab 的根视图
        while (ui.pageStack.length) closePage();
        switchTab(btn.dataset.tab);
        if (btn.dataset.tab === "home" && dom.homeScroll) {
          dom.homeScroll.scrollTo({ top: 0, behavior: "smooth" });
        }
      });
    });

    // ---- 主页面：头图卡片（切换梦角 / 更换背景） ----
    dom.heroSwitch.addEventListener("click", openCharPanel);
    dom.heroBgBtn.addEventListener("click", () => {
      pickImage((dataUrl) => setBackground("heroBg", dataUrl));
      showToast("选择一张图片作为头图背景", { icon: "image" });
    });
    dom.homeThemeBtn.addEventListener("click", () => {
      setTheme(state.prefs.theme === "dark" ? "light" : "dark");
    });
    dom.homeMineBtn.addEventListener("click", () => switchTab("mine"));
    dom.homeSettingsBtn.addEventListener("click", () => switchTab("settings"));

    // ---- 主页面：纪念日卡片 + 音乐小组件 ----
    dom.duoAnn.addEventListener("click", () => openPage("anniversary"));
    dom.miniOpen.addEventListener("click", () => openPage("music"));
    dom.miniOpen.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") { event.preventDefault(); openPage("music"); }
    });
    dom.miniPrev.addEventListener("click", (event) => { event.stopPropagation(); playPrev(); });
    dom.miniNext.addEventListener("click", (event) => { event.stopPropagation(); playNext(false); });
    dom.miniPlay.addEventListener("click", (event) => { event.stopPropagation(); togglePlay(); });

    // ---- 主页面：宫格入口 ----
    dom.gridEntries.addEventListener("click", (event) => {
      const cell = event.target.closest("[data-page]");
      if (cell) openPage(cell.dataset.page);
    });

    // ---- 设置 Tab ----
    [dom.themeGroup, dom.appearanceThemeGroup].forEach((group) => {
      if (!group) return;
      group.addEventListener("click", (event) => {
        const btn = event.target.closest("[data-theme-value]");
        if (btn) setTheme(btn.dataset.themeValue);
      });
    });
    dom.fontGroup.addEventListener("click", (event) => {
      const btn = event.target.closest("[data-font-value]");
      if (btn) setFontScale(btn.dataset.fontValue);
    });
    dom.openAppearance.addEventListener("click", () => openPage("appearance"));
    dom.openChatPrefs.addEventListener("click", openSettings);
    dom.openCharManager.addEventListener("click", openCharPanel);
    dom.settingsCharBtn.addEventListener("click", () => { closeSettings(); openCharPanel(); });
    dom.exportChatBtn.addEventListener("click", exportChatRecords);
    dom.importChatBtn.addEventListener("click", () => { dom.chatFileInput.value = ""; dom.chatFileInput.click(); });
    dom.chatFileInput.addEventListener("change", () => {
      const file = dom.chatFileInput.files && dom.chatFileInput.files[0];
      dom.chatFileInput.value = "";
      importChatRecords(file);
    });
    dom.openCallHistory.addEventListener("click", () => openPage("callHistory"));
    dom.clearAllBtn.addEventListener("click", () => {
      openConfirm({
        icon: "trash",
        title: "清空全部本地缓存？",
        sub: "所有梦角的聊天、信件、塔罗、纪念日、朋友圈、日记、日历记录，以及字卡、歌单和设置都会被删除，且无法恢复。",
        confirmText: "确认清空",
        danger: true,
        onConfirm: resetAllData
      });
    });

    // ---- 我的 Tab ----
    dom.mineProfile.addEventListener("click", openUserEditor);

    // ---- 梦角面板 ----
    dom.charPanelAdd.addEventListener("click", () => openCharEditor(null));
    dom.charPanelClose.addEventListener("click", closeCharPanel);
    document.querySelector("[data-close-char]")?.addEventListener("click", closeCharPanel);

    // ---- 外观设置 ----
    dom.bgGrid.addEventListener("click", (event) => {
      const slot = event.target.closest("[data-bg]");
      if (slot) openBgPicker(slot.dataset.bg);
    });
    dom.alphaRange.addEventListener("input", () => {
      state.prefs.appearance.alpha = clamp(Math.round(numberOr(dom.alphaRange.value, 100)), 40, 100);
      dom.alphaLabel.textContent = state.prefs.appearance.alpha + "%";
      applyAppearance();
    });
    dom.alphaRange.addEventListener("change", () => {
      persist();
      if (dom.appearanceSub) dom.appearanceSub.textContent = appearanceSummary();
    });
    dom.bubbleCssSave.addEventListener("click", () => {
      state.prefs.appearance.bubbleCss = dom.bubbleCssInput.value.slice(0, 4000);
      persist();
      applyBubbleCss();
      showToast("气泡样式已应用", { icon: "palette" });
    });
    dom.bubbleCssReset.addEventListener("click", () => {
      state.prefs.appearance.bubbleCss = "";
      dom.bubbleCssInput.value = "";
      persist();
      applyBubbleCss();
      showToast("已恢复默认气泡样式", { icon: "refresh" });
    });

    // ---- 朋友圈 ----
    dom.momentPostBtn.addEventListener("click", postMoment);
    dom.momentCharBtn.addEventListener("click", charPostMoment);
    dom.momentImageBtn.addEventListener("click", () => {
      dom.momentFileInput.value = "";
      dom.momentFileInput.click();
    });
    dom.momentFileInput.addEventListener("change", () => {
      const file = dom.momentFileInput.files && dom.momentFileInput.files[0];
      dom.momentFileInput.value = "";
      handlePickedFile(file, (dataUrl) => {
        ui.momentImage = dataUrl;
        updateMomentThumb();
      });
    });
    dom.momentThumbClear.addEventListener("click", () => {
      ui.momentImage = "";
      updateMomentThumb();
    });

    // ---- 日记 ----
    dom.diaryAddBtn.addEventListener("click", () => openDiaryEditor(null));

    // ---- 日历 ----
    dom.calAddBtn.addEventListener("click", () => openCalEditor(null));
    dom.calPrev.addEventListener("click", () => {
      const cursor = ui.calCursor;
      ui.calCursor = new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1);
      renderCalendar();
    });
    dom.calNext.addEventListener("click", () => {
      const cursor = ui.calCursor;
      ui.calCursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);
      renderCalendar();
    });

    // ---- 头像 / 背景图片选择 ----
    dom.avatarFileInput.addEventListener("change", () => {
      const file = dom.avatarFileInput.files && dom.avatarFileInput.files[0];
      dom.avatarFileInput.value = "";
      const handler = imagePickHandler;
      imagePickHandler = null;
      handlePickedFile(file, handler);
    });


    // ---- 子页面返回 ----
    document.querySelectorAll("[data-back]").forEach((btn) => {
      btn.addEventListener("click", () => {
        if (btn.id === "mailBack") { handleMailBack(); return; }
        closePage();
      });
    });

    // ---- 聊天页 ----
    dom.backBtn.addEventListener("click", closePage);
    dom.moreBtn.addEventListener("click", openSettings);
    dom.closeSettings.addEventListener("click", closeSettings);
    document.querySelector("[data-close-settings]")?.addEventListener("click", closeSettings);
    dom.saveSettings.addEventListener("click", saveSettings);
    dom.openCardsBtn.addEventListener("click", () => { closeSettings(); openPage("cards"); });
    dom.clearChatBtn.addEventListener("click", () => {
      openConfirm({
        icon: "trash", title: "清空聊天记录？", sub: "这段对话会从手机里消失，字卡库和你的设置会保留。",
        confirmText: "确认清空", danger: true, onConfirm: clearConversation
      });
    });
    // 回复条数：最少 / 最多 两个步进器
    dom.replyMinMinus.addEventListener("click", () => nudgeReplyRange("min", -1));
    dom.replyMinPlus.addEventListener("click", () => nudgeReplyRange("min", 1));
    dom.replyMaxMinus.addEventListener("click", () => nudgeReplyRange("max", -1));
    dom.replyMaxPlus.addEventListener("click", () => nudgeReplyRange("max", 1));
    [dom.replyMinInput, dom.replyMaxInput].forEach((input) => {
      input.addEventListener("input", updateReplyModeHint);
      input.addEventListener("blur", () => {
        const range = readReplyRange();
        dom.replyMinInput.value = range.min;
        dom.replyMaxInput.value = range.max;
        updateReplyModeHint();
      });
    });
    dom.minSecondsInput.addEventListener("input", updateDelayPreview);
    dom.maxSecondsInput.addEventListener("input", updateDelayPreview);
    // 主动消息 / 主动来信开关
    dom.proactiveMsgToggle.addEventListener("click", () => {
      setSwitch(dom.proactiveMsgToggle, !isSwitchOn(dom.proactiveMsgToggle));
      updateProactiveFields();
    });
    dom.proactiveMailToggle.addEventListener("click", () => {
      setSwitch(dom.proactiveMailToggle, !isSwitchOn(dom.proactiveMailToggle));
      updateProactiveFields();
    });
    dom.charNameInput.addEventListener("input", () => {
      dom.settingsAvatar.textContent = initialOf(dom.charNameInput.value || "梦");
    });

    // ---- 字卡库 ----
    dom.importCardsBtn.addEventListener("click", () => dom.cardsFileInput.click());
    dom.exportCardsBtn.addEventListener("click", exportCards);
    dom.cardsFileInput.addEventListener("change", async () => {
      const file = dom.cardsFileInput.files && dom.cardsFileInput.files[0];
      if (!file) return;
      try {
        importCardsFromText(await file.text(), file.name);
      } catch (error) {
        showToast("文件读取失败，换一个文件试试", { icon: "upload" });
      } finally {
        dom.cardsFileInput.value = "";
      }
    });
    // 分类标签栏：全部 / 各分类 / 未分类 / ＋分类
    dom.catBar.addEventListener("click", (event) => {
      const chip = event.target.closest("button[data-cat]");
      if (!chip) return;
      const value = chip.dataset.cat;
      if (value === "add") {
        if (state.cardCategories.length >= MAX_CATEGORIES) {
          showToast("最多只能建 " + MAX_CATEGORIES + " 个分类", { icon: "folder" });
          return;
        }
        openCategoryForm(null, false);
        return;
      }
      ui.cardFilter = value;
      renderCards();
    });
    dom.manageCatsBtn.addEventListener("click", openCategoryManager);
    dom.newCardBtn.addEventListener("click", () => openCardForm(null));
    dom.createCatBtn.addEventListener("click", () => openCategoryForm(null, false));
    dom.cardSearch.addEventListener("input", () => { ui.cardQuery = dom.cardSearch.value; renderCards(); });
    dom.cardList.addEventListener("click", (event) => {
      const button = event.target.closest("button[data-action]");
      if (!button) return;
      const id = button.dataset.id;
      if (button.dataset.action === "edit") openCardForm(id);
      if (button.dataset.action === "delete") deleteCard(id);
    });

    // ---- 塔罗 ----
    dom.tarotScopeBar.addEventListener("click", (event) => {
      const chip = event.target.closest("button[data-scope]");
      if (!chip) return;
      ui.tarotScope = chip.dataset.scope;
      renderTarot();
    });
    dom.drawOneBtn.addEventListener("click", () => drawTarot(1));
    dom.drawThreeBtn.addEventListener("click", () => drawTarot(3));
    dom.tarotFavBtn.addEventListener("click", () => {
      ui.tarotFilter = !ui.tarotFilter;
      renderTarot();
    });

    // ---- 信箱 ----
    dom.mailComposeBtn.addEventListener("click", () => openMailEditor(null));
    dom.mailCancelBtn.addEventListener("click", showMailList);
    dom.mailSaveBtn.addEventListener("click", saveMail);
    dom.mailTitleInput.addEventListener("input", () => {
      const letter = ui.mailEditingId ? state.mail.letters.find((l) => l.id === ui.mailEditingId) : null;
      const len = dom.mailBodyInput.value.length;
      dom.mailEditorMeta.textContent = (letter ? "创建于 " + formatDateTime(letter.createdAt) + " · " : "") + len + " 字";
    });

    // ---- 纪念日 ----
    dom.annAddBtn.addEventListener("click", () => openAnnModal(null));

    // ---- 音乐 ----
    dom.musicAddBtn.addEventListener("click", () => openAddTrackModal(false));
    if (dom.openPlaylistBtn) dom.openPlaylistBtn.addEventListener("click", openPlaylistModal);
    // 本地音频导入：文件选择完成后读取并加入当前梦角歌单
    if (dom.musicFileInput) {
      dom.musicFileInput.addEventListener("change", async () => {
        const file = dom.musicFileInput.files && dom.musicFileInput.files[0];
        const returnTo = ui.musicImportReturn;
        dom.musicFileInput.value = "";
        if (!file) return;
        await importLocalAudio(file, returnTo);
      });
    }
    dom.playerPlay.addEventListener("click", togglePlay);
    dom.playerNext.addEventListener("click", () => playNext(false));
    dom.playerPrev.addEventListener("click", playPrev);
    dom.playerMode.addEventListener("click", cycleMode);
    dom.playerSeek.addEventListener("input", () => {
      const track = currentTrack();
      if (!track || dom.playerSeek.disabled) return;
      ui.seeking = true;
      state.music.state.position = numberOr(dom.playerSeek.value, 0);
      dom.playerCurrent.textContent = formatDuration(state.music.state.position);
      // 真实音频：拖动时同步 currentTime，松手后从新位置继续播放
      if (audioEl && audioEl.dataset.trackId === track.id) {
        try { audioEl.currentTime = state.music.state.position; } catch (error) { /* 忽略 */ }
      }
    });
    dom.playerSeek.addEventListener("change", () => {
      ui.seeking = false;
      persist();
    });
    dom.playerVolume.addEventListener("input", () => {
      state.music.state.volume = clamp(Math.round(numberOr(dom.playerVolume.value, 60)), 0, 100);
      dom.playerVolumeLabel.textContent = state.music.state.volume + "%";
      applyVolume();
      if (audioEl) audioEl.volume = clamp(state.music.state.volume / 100, 0, 1);
      persist();
    });
    dom.playerVolumeIcon.addEventListener("click", () => {
      if (state.music.state.volume > 0) {
        ui.lastVolume = state.music.state.volume;
        state.music.state.volume = 0;
      } else {
        state.music.state.volume = ui.lastVolume || 60;
      }
      applyVolume();
      if (audioEl) audioEl.volume = clamp(state.music.state.volume / 100, 0, 1);
      persist();
      renderPlayer();
      showToast(state.music.state.volume === 0 ? "已静音" : "已恢复音量", { icon: state.music.state.volume === 0 ? "mute" : "volume" });
    });

    // ---- 聊天输入区 ----
    dom.plusBtn.addEventListener("click", openToolPanel);
    dom.emojiBtn.addEventListener("click", () => openEmojiPanel("emoji"));
    dom.closeEmoji.addEventListener("click", closePanels);
    dom.panelScrim.addEventListener("click", closePanels);
    dom.toolMode.addEventListener("click", (event) => {
      const btn = event.target.closest("[data-mode]");
      if (btn) setToolMode(btn.dataset.mode);
    });
    dom.toolPanel.addEventListener("click", (event) => {
      const button = event.target.closest("[data-tool]");
      if (button) handleTool(button.dataset.tool);
    });
    Array.from(dom.toolDotsMe.children).forEach((dot) => {
      dot.addEventListener("click", () => {
        dom.toolsScrollMe.scrollTo({ left: Number(dot.dataset.page) * dom.toolsScrollMe.clientWidth, behavior: "smooth" });
      });
    });
    dom.toolsScrollMe.addEventListener("scroll", updateToolPage, { passive: true });
    dom.emojiTabs.forEach((tab) => tab.addEventListener("click", () => switchEmojiTab(tab.dataset.emojiTab)));
    dom.emojiGrid.addEventListener("click", (event) => {
      const button = event.target.closest("button[data-emoji]");
      if (button) insertAtCursor(button.dataset.emoji);
    });
    dom.kaomojiGrid.addEventListener("click", (event) => {
      const button = event.target.closest("button[data-kaomoji]");
      if (button) insertAtCursor(button.dataset.kaomoji);
    });

    dom.sendBtn.addEventListener("click", sendTextMessage);
    dom.messageInput.addEventListener("input", autoResizeInput);
    dom.messageInput.addEventListener("keydown", (event) => {
      if (event.key === "Enter" && !event.shiftKey && !event.isComposing) {
        event.preventDefault();
        sendTextMessage();
      }
    });
    dom.quoteDraftClose.addEventListener("click", clearQuoteDraft);

    // ---- 消息操作 ----
    dom.actionCancel.addEventListener("click", closeActionSheet);
    document.querySelector("[data-close-action]")?.addEventListener("click", closeActionSheet);
    dom.actionList.addEventListener("click", (event) => {
      const button = event.target.closest("button[data-action]");
      if (button) performMessageAction(button.dataset.action);
    });

    // ---- 通话 ----
    document.querySelector("[data-close-modal]")?.addEventListener("click", closeModal);
    dom.muteBtn.addEventListener("click", () => {
      dom.muteBtn.classList.toggle("active");
      showToast(dom.muteBtn.classList.contains("active") ? "已静音" : "已取消静音", { icon: "mute" });
    });
    dom.speakerBtn.addEventListener("click", () => {
      dom.speakerBtn.classList.toggle("active");
      showToast(dom.speakerBtn.classList.contains("active") ? "已打开免提" : "已关闭免提", { icon: "speaker" });
    });
    dom.hangupBtn.addEventListener("click", endCall);
    dom.callMinimize.addEventListener("click", minimizeCall);
    dom.callMini.addEventListener("click", restoreCall);

    // ---- 图片 / 拍照 ----
    dom.imageInput.addEventListener("change", () => {
      const file = dom.imageInput.files && dom.imageInput.files[0];
      dom.imageInput.value = "";
      handleImageFile(file);
    });
    dom.cameraInput.addEventListener("change", () => {
      const file = dom.cameraInput.files && dom.cameraInput.files[0];
      dom.cameraInput.value = "";
      handleImageFile(file);
    });

    // ---- 录音 ----
    dom.micBtn.addEventListener("pointerdown", (event) => {
      if (event.button !== undefined && event.button !== 0) return;
      event.preventDefault();
      try { dom.micBtn.setPointerCapture(event.pointerId); } catch (error) { /* 忽略 */ }
      startRecording();
    });
    window.addEventListener("pointerup", () => { if (ui.recording) stopRecording(); });
    window.addEventListener("pointercancel", () => { if (ui.recording) cancelRecording(); });
    dom.micBtn.addEventListener("click", (event) => {
      if (Date.now() < ui.ignoreMicClickUntil) return;
      if (event.detail === 0) showToast("按住麦克风按钮说话，松开即可发送", { icon: "mic" });
    });
    dom.micBtn.addEventListener("contextmenu", (event) => event.preventDefault());

    // ---- 气泡长按 / 右键 / 点击 ----
    dom.messageList.addEventListener("pointerdown", (event) => {
      if (event.button !== undefined && event.button !== 0) return;
      const bubble = event.target.closest(".bubble");
      if (!bubble || event.target.closest(".bubble-more")) return;
      pressedBubble = bubble;
      pressOrigin = { x: event.clientX, y: event.clientY };
      clearTimeout(pressTimer);
      pressTimer = setTimeout(() => {
        if (!pressedBubble) return;
        ui.suppressClickUntil = Date.now() + 700;
        openActionSheet(pressedBubble.dataset.messageId);
        pressedBubble = null;
      }, 520);
    });
    dom.messageList.addEventListener("pointermove", (event) => {
      if (!pressOrigin) return;
      if (Math.abs(event.clientX - pressOrigin.x) > 8 || Math.abs(event.clientY - pressOrigin.y) > 8) {
        clearTimeout(pressTimer);
        pressedBubble = null;
      }
    });
    window.addEventListener("pointerup", () => {
      clearTimeout(pressTimer);
      pressedBubble = null;
      pressOrigin = null;
    });
    dom.messageList.addEventListener("contextmenu", (event) => {
      const bubble = event.target.closest(".bubble");
      if (!bubble) return;
      event.preventDefault();
      openActionSheet(bubble.dataset.messageId);
    });
    dom.messageList.addEventListener("click", (event) => {
      if (Date.now() < ui.suppressClickUntil) return;
      const more = event.target.closest(".bubble-more");
      if (more) { openActionSheet(more.dataset.messageId); return; }
      const voice = event.target.closest(".voice-bubble");
      if (voice) {
        const parent = voice.closest(".bubble");
        voice.classList.toggle("playing");
        const duration = Number((parent && parent.dataset.duration) || 3);
        setTimeout(() => voice.classList.remove("playing"), Math.min(6000, Math.max(1200, duration * 1000)));
        return;
      }
      const redpacket = event.target.closest(".redpacket-card");
      if (redpacket) showToast("红包的心意已经被好好收下了", { icon: "redpacket" });
    });

    dom.chat.addEventListener("scroll", updateScrollButton, { passive: true });
    dom.scrollDown.addEventListener("click", () => scrollToBottom("smooth"));

    dom.settingsLayer.addEventListener("click", (event) => { if (event.target === dom.settingsLayer) closeSettings(); });
    dom.actionLayer.addEventListener("click", (event) => { if (event.target === dom.actionLayer) closeActionSheet(); });
    dom.genericLayer.addEventListener("click", (event) => { if (event.target === dom.genericLayer) closeModal(); });

    // ---- 键盘 Esc ----
    document.addEventListener("keydown", (event) => {
      if (event.key !== "Escape") return;
      if (ui.currentCall) { endCall(); return; }
      if (dom.genericLayer.classList.contains("open")) { closeModal(); return; }
      if (dom.actionLayer.classList.contains("open")) { closeActionSheet(); return; }
      if (dom.settingsLayer.classList.contains("open")) { closeSettings(); return; }
      if (dom.toolPanel.classList.contains("open") || dom.emojiPanel.classList.contains("open")) { closePanels(); return; }
      if (ui.pageStack.length) closePage();
    });

    window.addEventListener("resize", () => {
      autoResizeInput();
      updateToolPage();
    });

    dom.emojiBtn.setAttribute("aria-expanded", "false");
    dom.plusBtn.setAttribute("aria-expanded", "false");
  }

  /* =======================================================
     28. 启动
     ======================================================= */
  function init() {
    applyPrefs();
    renderEmojiPanel();
    switchEmojiTab("emoji");
    setToolMode("me");
    renderHeader();
    renderMessages({ forceScroll: true });
    autoResizeInput();
    renderHome();
    renderSettingsTab();
    renderMine();
    renderCards();
    renderTarot();
    renderMail();
    renderAnniversary();
    renderMoments();
    renderDiary();
    renderCalendar();
    renderStats();
    renderPlaylist();
    renderPlayer();
    updateMomentThumb();
    if (dom.homeThemeBtn) dom.homeThemeBtn.replaceChildren(makeIcon(state.prefs.theme === "dark" ? "sun" : "moon"));
    bindEvents();
    switchTab(ui.tab);
    // 按聊天设置排期「主动消息 / 主动来信」
    restartProactiveTimers();
    setTimeout(() => {
      dom.chat.scrollTop = dom.chat.scrollHeight;
      updateToolPage();
    }, 120);
  }

  init();
})();
