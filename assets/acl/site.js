const table = document.querySelector("main table");
    if (table && table.tBodies.length && table.tHead) {
      const tools = document.querySelector(".tools");
      const search = tools.querySelector("input");
      const league = tools.querySelector("select");
      const count = tools.querySelector("output");
      const rows = Array.from(table.tBodies[0].rows);
      const data = document.querySelector("#season-data").dataset;
      const players = JSON.parse(data.players) || {};
      const badges = JSON.parse(data.badges) || {};
      const measurements = JSON.parse(data.measurements || "{}");
      const historicalBadges = JSON.parse(data.historyBadges || "{}");
      const notes = { ...JSON.parse(data.notes), ...JSON.parse(data.history || "{}") };
      function assetUrl(src) {
        return src?.startsWith("assets/") ? data.assetBase.replace(/\/$/, "") + "/" + src : src;
      }
      function addImage(cell, src, portrait = false) {
        if (!src) return;
        const identity = document.createElement("span");
        identity.className = "identity";
        const image = new Image();
        image.src = assetUrl(src);
        image.alt = "";
        if (portrait) image.className = "portrait";
        identity.append(image, document.createTextNode(cell.textContent.trim()));
        cell.replaceChildren(identity);
      }
      function ageOnDate(birthday, injuryDate) {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(injuryDate) || injuryDate < birthday) return null;
        return Number(injuryDate.slice(0, 4)) - Number(birthday.slice(0, 4))
          - Number(injuryDate.slice(5) < birthday.slice(5));
      }
      const birthdayHeading = document.createElement("th");
      birthdayHeading.scope = "col";
      birthdayHeading.textContent = "生日（受伤时年龄）";
      table.tHead.rows[0].cells[6].before(birthdayHeading);
      for (const row of rows) {
        const cells = row.cells;
        const english = cells[2].textContent.trim();
        const club = cells[4].textContent.trim();
        const leagueName = cells[5].textContent.trim();
        const note = notes[cells[0].textContent.trim() + "|" + english];
        const player = { ...players[english], ...note };
        row.dataset.league = note?.filterLeague || leagueName;
        addImage(cells[1], player.portrait, true);
        addImage(cells[4], historicalBadges.clubs?.[club] || badges.clubs[club]);
        addImage(cells[5], historicalBadges.leagues?.[leagueName] || badges.leagues[leagueName]);
        const birthday = row.insertCell(6);
        birthday.className = "birthday";
        birthday.textContent = player?.birthday ?? "—";
        const years = note?.age ?? (player?.birthday ? ageOnDate(player.birthday, cells[0].textContent.trim()) : null);
        if (years !== null && !player?.birthday) birthday.textContent = years + " 岁";
        if (player?.birthday) {
          if (years !== null) {
            const age = document.createElement("span");
            age.className = "age";
            age.textContent = "（" + years + "岁）";
            const value = document.createElement("span");
            value.append(player.birthday, age);
            birthday.replaceChildren(value);
          }
        }
      }
      const dialog = document.querySelector("#record");
      const closeButton = dialog.querySelector("header button");
      closeButton.onclick = () => dialog.close();
      dialog.addEventListener("click", event => {
        const bounds = dialog.getBoundingClientRect();
        if (event.target === dialog && (event.clientX < bounds.left || event.clientX > bounds.right ||
            event.clientY < bounds.top || event.clientY > bounds.bottom)) dialog.close();
      });
      const fmPositions = JSON.parse(data.positions || "{}") || {};
      // Coordinates use the attacking team's perspective, with the opponent's goal at the top.
      const spots = {
        GK:[60,140,"门将"], DL:[18,116,"左后卫"], DC:[60,116,"中后卫"], DR:[102,116,"右后卫"],
        WBL:[18,92,"左翼卫"], DM:[60,92,"后腰"], WBR:[102,92,"右翼卫"],
        ML:[18,68,"左前卫"], MC:[60,68,"中前卫"], MR:[102,68,"右前卫"],
        AML:[18,44,"左边锋"], AMC:[60,44,"前腰"], AMR:[102,44,"右边锋"], ST:[60,20,"中锋"]
      };
      const gradeNames = {Natural:"自然", Accomplished:"熟练", Competent:"胜任", Unconvincing:"生疏", Awkward:"勉强"};
      const graphic = dialog.querySelector(".fm-figure");
      const svg = graphic.querySelector("svg");
      function svgNode(tag, attrs = {}) {
        const el = document.createElementNS("http://www.w3.org/2000/svg", tag);
        for (const [key, value] of Object.entries(attrs)) el.setAttribute(key, value);
        return el;
      }
      function drawPositions(record) {
        const markers = svg.querySelector(".fm-markers");
        markers.replaceChildren();
        graphic.hidden = !record;
        if (!record) return;
        const version = record.versionLabel || "FM27";
        graphic.querySelector(".fm-position-label").textContent = version + " 位置";
        const descriptions = [];
        for (const [code, [x, y, name]] of Object.entries(spots)) {
          const score = record.scores?.[code];
          const grade = record.grades?.[code];
          if (score == null && !grade && !record.listed?.includes(code)) continue;
          const label = score ?? gradeNames[grade] ?? code;
          const desc = name + (label === code ? "" : " " + label);
          descriptions.push(desc);
          const mark = svgNode("g", {transform: "translate(" + x + " " + y + ")"});
          const title = svgNode("title");
          title.textContent = desc;
          const strong = score >= 18 || grade === "Natural";
          const box = svgNode("rect", {x:-13, y:-8, width:26, height:16, rx:4, fill:strong ? "#c6ed73" : "#eff6dc"});
          const text = svgNode("text", {y:3.5});
          text.textContent = label;
          mark.append(title, box, text);
          markers.append(mark);
        }
        svg.setAttribute("aria-label", version + " 位置适应度：" + descriptions.join("，"));
      }
      function showRecord(row) {
        const cells = row.cells;
        const values = Array.from(cells, cell => cell.textContent.trim());
        const [date, name, english, position] = values;
        const note = notes[date + "|" + english] || {};
        const player = { ...players[english], ...note };
        drawPositions(note.positions || fmPositions[english]);
        const portrait = dialog.querySelector(".portrait");
        portrait.hidden = !player?.portrait;
        if (player?.portrait) portrait.src = assetUrl(player.portrait);
        dialog.querySelector("#record-name").textContent = name;
        dialog.querySelector("#english").textContent = english;
        const copyCell = cell => Array.from(cell.childNodes, node => node.cloneNode(true));
        const physical = measurements[english] || {};
        const meta = dialog.querySelector(".meta");
        meta.replaceChildren(...copyCell(cells[4]), ...copyCell(cells[5]));
        for (const label of [position, physical.heightCm && physical.heightCm + " cm", physical.weightKg && physical.weightKg + " kg"].filter(Boolean)) {
          const item = document.createElement("span");
          item.className = "bio-item";
          item.textContent = "· " + label;
          meta.append(item);
        }
        const years = note.age ?? (player?.birthday ? ageOnDate(player.birthday, date) : null);
        const facts = dialog.querySelector(".facts p");
        const nationality = document.createElement("span");
        nationality.textContent = note.nationality ?? player?.nationality ?? "";
        addImage(nationality, note.flag ?? player?.flag);
        nationality.classList.add("nationality");
        const personalDetails = [player?.birthday && player.birthday + " 出生",
          years !== null && "受伤时 " + years + " 岁"].filter(Boolean);
        facts.replaceChildren(...(nationality.textContent ? [nationality] : []));
        for (const detail of personalDetails) {
          if (facts.hasChildNodes()) facts.append("　·　");
          facts.append(detail);
        }
        dialog.querySelector("#event").textContent = date + " · " + (note.event || values[8]) + (note.noticeDate ? "（公告或报道：" + note.noticeDate + "）" : "");
        dialog.querySelector("#injury").textContent = note.injury || values[7];
        dialog.querySelector("#attribution").textContent = note.injurySource || "";
        const links = Array.from(cells[9].querySelectorAll("a"), link => link.cloneNode(true));
        if (links.length && note.sourceLabel) links[0].textContent = note.sourceLabel;
        const supplemental = [{label: note.extraLabel, url: note.extraUrl}, ...(note.links || [])];
        for (const {label, url} of supplemental) {
          if (!label || !/^https?:\/\//i.test(url)) continue;
          const extra = document.createElement("a");
          extra.href = url;
          extra.textContent = label;
          links.push(extra);
        }
        for (const link of links) { link.target = "_blank"; link.rel = "noopener"; }
        dialog.querySelector("#sources").replaceChildren(...links);
        dialog.showModal();
        dialog.scrollTop = 0;
      }
      for (const row of rows) {
        const cell = row.cells[1];
        const button = document.createElement("button");
        button.type = "button";
        button.className = "player-open";
        button.setAttribute("aria-haspopup", "dialog");
        button.append(...Array.from(cell.childNodes));
        cell.append(button);
        row.classList.add("record-row");
        row.addEventListener("click", event => {
          if (event.target.closest("a")) return;
          button.focus({ preventScroll: true });
          showRecord(row);
        });
      }
      const headings = Array.from(table.tHead.rows[0].cells, cell => cell.textContent.trim());
      const leagues = new Set();
      for (const row of rows) {
        Array.from(row.cells).slice(3, 9).forEach((cell, i) => cell.dataset.label = i === 3 ? "生日" : headings[i + 3]);
        leagues.add(row.dataset.league);
      }
      const other = leagues.delete("其他");
      for (const name of leagues) league.add(new Option(name, name));
      if (other) league.add(new Option("其他", "其他"));
      const scroll = document.createElement("div");
      scroll.className = "scroll";
      scroll.tabIndex = 0;
      scroll.setAttribute("role", "region");
      scroll.setAttribute("aria-label", "球员伤病名单");
      table.before(tools, scroll);
      scroll.append(table);
      function filter() {
        const query = search.value.trim().toLocaleLowerCase();
        let visible = 0;
        for (const row of rows) {
          const matchesName = [1, 2, 4].some(i => row.cells[i].textContent.toLocaleLowerCase().includes(query));
          row.hidden = !matchesName || (league.value !== "" && row.dataset.league !== league.value);
          if (!row.hidden) visible++;
        }
        count.textContent = visible === rows.length ? "共 " + visible + " 条记录" : visible + " / " + rows.length + " 条记录";
        document.getElementById("empty").hidden = visible > 0;
        scroll.scrollTop = 0;
      }
      search.addEventListener("input", filter);
      league.addEventListener("change", filter);
      filter();
      tools.hidden = false;
    }
