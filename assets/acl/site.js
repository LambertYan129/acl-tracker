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
      const notes = JSON.parse(data.notes) || {};
      function addImage(cell, src, portrait = false) {
        if (!src) return;
        const identity = document.createElement("span");
        identity.className = "identity";
        const image = new Image();
        image.src = src;
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
        const player = players[cells[2].textContent.trim()];
        addImage(cells[1], player?.portrait, true);
        addImage(cells[4], badges.clubs[cells[4].textContent.trim()]);
        addImage(cells[5], badges.leagues[cells[5].textContent.trim()]);
        const birthday = row.insertCell(6);
        birthday.className = "birthday";
        birthday.textContent = player?.birthday ?? "—";
        if (player) {
          const years = ageOnDate(player.birthday, cells[0].textContent.trim());
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
      function showRecord(row) {
        const cells = row.cells;
        const values = Array.from(cells, cell => cell.textContent.trim());
        const [date, name, english, position] = values;
        const player = players[english];
        const note = notes[date + "|" + english] || {};
        const portrait = dialog.querySelector(".portrait");
        portrait.hidden = !player?.portrait;
        if (player?.portrait) portrait.src = player.portrait;
        dialog.querySelector("#record-name").textContent = name;
        dialog.querySelector("#english").textContent = english;
        const copyCell = cell => Array.from(cell.childNodes, node => node.cloneNode(true));
        dialog.querySelector(".meta").replaceChildren(...copyCell(cells[4]), ...copyCell(cells[5]), " · " + position);
        const years = player?.birthday ? ageOnDate(player.birthday, date) : null;
        dialog.querySelector(".facts p").textContent = [player?.nationality, player?.birthday && player.birthday + " 出生",
          years !== null && "受伤时 " + years + " 岁"].filter(Boolean).join("　·　");
        dialog.querySelector("#event").textContent = date + " · " + (note.event || values[8]);
        dialog.querySelector("#injury").textContent = values[7];
        dialog.querySelector("#attribution").textContent = note.injurySource || "";
        const links = Array.from(cells[9].querySelectorAll("a"), link => link.cloneNode(true));
        if (links.length && note.sourceLabel) links[0].textContent = note.sourceLabel;
        if (note.extraLabel && /^https?:\/\//i.test(note.extraUrl)) {
          const extra = document.createElement("a");
          extra.href = note.extraUrl;
          extra.textContent = note.extraLabel;
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
        leagues.add(row.cells[5].textContent.trim());
      }
      for (const name of leagues) league.add(new Option(name, name));
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
          row.hidden = !matchesName || (league.value !== "" && row.cells[5].textContent.trim() !== league.value);
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
