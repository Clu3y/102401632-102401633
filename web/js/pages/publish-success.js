/* pages/publish-success.js — 发布成功页（对应 pages/publish-success/index） */
window.LF = window.LF || {};
LF.pages = LF.pages || {};

(function (LF) {
  var esc = LF.ui.escapeHtml;

  LF.pages.publishSuccess = {
    mount: function (main, query) {
      query = query || {};
      var type = query.type === 'found' ? 'found' : 'lost';
      var isFound = type === 'found';
      var name = query.name ? query.name : '';
      var itemNo = query.itemNo ? query.itemNo : '';
      var userInfo = LF.auth.getUserInfo();
      var accountText = userInfo
        ? esc(userInfo.nickname || '') + (userInfo.college ? ' · ' + esc(userInfo.college) : '')
        : '';

      var root = document.createElement('div');
      root.className = 'page success-root';
      root.innerHTML =
        '<div class="page-flow">' +
          '<div class="success-page">' +
            '<div class="hero">' +
              '<div class="success-icon">' + LF.icons.render('circle-check') + '</div>' +
              '<div class="success-title">发布成功</div>' +
              '<div class="success-desc">' +
                '<div class="success-desc-line">你的信息已经发布到校园失物招领平台，</div>' +
                '<div class="success-desc-line">当前浏览器可在首页和搜索中查看这条信息。</div>' +
              '</div>' +
            '</div>' +

            '<div class="receipt card">' +
              '<div class="receipt-badges">' +
                '<span class="tag-' + type + '">' + (isFound ? '招领' : '失物') + '</span>' +
                '<span class="tag-' + (isFound ? 'pending_claim' : 'searching') + '">' + (isFound ? '待认领' : '寻找中') + '</span>' +
                '<span class="receipt-time">刚刚发布</span>' +
              '</div>' +
              '<div class="receipt-name">' + esc(name) + '</div>' +
              '<div class="receipt-info">' +
                '<div class="receipt-row"><span class="receipt-label">信息编号</span><span class="receipt-value">' + esc(itemNo) + '</span></div>' +
                (userInfo ? '<div class="receipt-row"><span class="receipt-label">发布账号</span><span class="receipt-value">' + accountText + '</span></div>' : '') +
                '<div class="receipt-row"><span class="receipt-label">可见范围</span><span class="receipt-value">当前浏览器本地</span></div>' +
              '</div>' +
              '<div class="next-tip"><span class="tip-icon">' + LF.icons.render('bell') + '</span>' +
              '<span class="tip-text">有同学联系你时，请先核对物品特征再约时间地点；物品找回后记得在“我的发布”里更新状态。</span></div>' +
            '</div>' +

            '<div class="steps card">' +
              '<div class="steps-title">接下来可以做什么</div>' +
              '<div class="step-item"><div class="step-num">1</div>' +
              '<div class="step-text">在“我的发布”中随时查看这条信息的当前状态。</div></div>' +
              '<div class="step-item"><div class="step-num">2</div>' +
              '<div class="step-text">物品找回或归还后，把状态改为“已找回 / 已归还”，避免继续被打扰。</div></div>' +
              '<div class="step-item"><div class="step-num">3</div>' +
              '<div class="step-text">也可以去首页搜一搜，看看是否已有同学发布了相关线索。</div></div>' +
            '</div>' +

            '<div class="links">' +
              '<div class="link-card" data-act="go-search"><span class="link-icon">' + LF.icons.render('search') + '</span>' +
              '<span class="link-title">去搜索线索</span><span class="link-sub">按物品名称查找</span></div>' +
              '<div class="link-card" data-act="go-home"><span class="link-icon">' + LF.icons.render('house') + '</span>' +
              '<span class="link-title">返回首页</span><span class="link-sub">浏览最新信息</span></div>' +
            '</div>' +
          '</div>' +
        '</div>' +

        '<div class="bottom-bar">' +
          '<div class="bar-btn primary" data-act="go-my">查看我发布的信息</div>' +
          '<div class="bar-btn outline" data-act="go-home">返回首页</div>' +
        '</div>';

      main.appendChild(root);

      root.addEventListener('click', function (e) {
        var el = e.target.closest('[data-act]');
        if (!el) return;
        var act = el.getAttribute('data-act');
        if (act === 'go-my') LF.router.go('#/my');
        else if (act === 'go-home') LF.router.go('#/home');
        else if (act === 'go-search') LF.router.go('#/search');
      });
    }
  };
})(window.LF);
