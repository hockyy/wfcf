// ==UserScript==
// @name         wfcf
// @version      1.0
// @description  Buat latihan wf
// @author       hocky
// @match        https://codeforces.com/*
// @match        http://codeforces.com/*
// @grant        none
// ==/UserScript==

const selfHandle = "eecs"

function createTableRow(data) {
  const tr = document.createElement('tr');
  tr.setAttribute('participantid', data.party.teamId);

  // Create the table cells
  const cells = [
    createTableCell(data.rank, 'left'),
    createContestantCell(data.party, ''),
    createTableCell(data.points, ''),
    createTableCell(data.penalty, '')
  ];

  // Add the problem result cells
  data.problemResults.forEach(result => {
    const problemCell = createProblemResultCell(result);
    cells.push(problemCell);
  });

  // Append cells to the row
  cells.forEach(cell => tr.appendChild(cell));

  return tr;
}

function createTableCell(content, className) {
  const td = document.createElement('td');
  if (className) td.classList.add(className);
  td.textContent = content;
  return td;
}

function createProblemResultCell(result) {
  const td = document.createElement('td');
  // if (result.type === 'FINAL') {
  if (result.points === 0.0) {
    td.innerHTML = `<span class="cell-rejected">${result.rejectedAttemptCount > 0 ? -result.rejectedAttemptCount : ''}</span>`;
  } else {
    const acceptedSpan = document.createElement('span');
    acceptedSpan.classList.add('cell-accepted');
    acceptedSpan.textContent = `+${result.rejectedAttemptCount > 0 ? result.rejectedAttemptCount : ''}`;
    const timeSpan = document.createElement('span');
    timeSpan.classList.add('cell-time');
    // Assuming time is in the format "hh:mm"
    const time = `${String(Math.floor(result.bestSubmissionTimeSeconds / 3600)).padStart(2, '0')}:${String(Math.floor((result.bestSubmissionTimeSeconds % 3600) / 60)).padStart(2, '0')}`;
    timeSpan.textContent = time;
    td.appendChild(acceptedSpan);
    td.appendChild(timeSpan);
  }
  // } else {
  //     // If the result type is not FINAL?
  // }

  return td;
}

function createContestantCell(party, className) {
  const td = document.createElement('td');
  if (className) td.classList.add(className);
  td.classList.add('contestant-cell');
  const span = document.createElement('span');
  span.style.fontSize = '1.1rem';

  // Create the flag image
  const flagImg = document.createElement('img');
  flagImg.classList.add('standings-flag');
  flagImg.src = `//codeforces.org/s/84141/images/flags-16/id.png`;
  flagImg.alt = party.country;
  flagImg.title = party.country;
  span.appendChild(flagImg);

  if (party.teamName) {
    const teamLink = document.createElement('a');
    teamLink.href = `/team/${party.teamId}`;
    teamLink.title = party.teamName;
    teamLink.textContent = party.teamName + ': ';
    span.appendChild(teamLink);
  }

  // Create participant links
  party.members.forEach((member, index) => {
    if (index > 0) {
      span.appendChild(document.createTextNode(', '));
    }
    const participantLink = document.createElement('a');
    participantLink.href = `/profile/${member.handle}`;
    participantLink.title = member.handle;
    participantLink.textContent = member.handle;
    participantLink.classList.add('rated-user', 'user-cyan')
    span.appendChild(participantLink);
  });

  // Add the virtual participant link
  const sup = document.createElement('sup');
  sup.style.marginLeft = '0.25em';
  sup.style.fontSize = '8px';
  const participantLink = document.createElement('a');
  participantLink.href = `/gym/${party.contestId}/standings/participant/${party.teamId}#p${party.teamId}`;
  participantLink.textContent = '#';
  sup.appendChild(participantLink);
  span.appendChild(sup);

  td.appendChild(span);
  return td;
}

function insertTableRow(res, data) {
  const tbody = $('table.standings tbody');
  const rows = tbody.find('tr[participantid]');
  const insertIndex = rows.toArray().findIndex((row) => {
    const currentData = extractDataFromRow(row);
    if (currentData.points < parseInt(data.points)) {
      return true;
    } else if (currentData.points === parseInt(data.points) && currentData.penalty > parseInt(data.penalty)) {
      return true;
    }
    return false;
  });
  if (insertIndex === -1) {
    tbody.append(res);
  } else {
    const adjustedRank = (2 * insertIndex + 1) / 2.0;
    res.querySelector('td').textContent = adjustedRank.toFixed(1);
    rows.eq(insertIndex).before(res);
  }
}

function extractDataFromRow(row) {
  // Extract the data from the row and return it as an object
  // Modify this function to fit your data structure
  const cells = row.querySelectorAll('td');
  const rank = parseInt(cells[0].textContent);
  const points = parseFloat(cells[2].textContent);
  const penalty = parseInt(cells[3].textContent);
  return {rank, points, penalty};
}

const obtainSelfGymData = (gymId) => {
  const apiUrl = `https://codeforces.com/api/contest.standings?contestId=${gymId}&from=1&count=5&showUnofficial=true&handles=${selfHandle}`;
  return fetch(apiUrl)
    .then(response => response.json())
    .then(data => {
      // Filter the rows based on conditions
      const filteredRows = data.result.rows.filter(row => {
        return row.party.participantType === "VIRTUAL" && row.party.teamName !== "";
      });
      if (filteredRows) {
        console.log("OK")
        console.log(filteredRows[0]);
        const rowData = filteredRows[0];
        return [rowData, createTableRow(rowData)];
      }
    })
    .catch(error => {
      console.trace(error);
      console.error(error);
    });
}

const getGymId = () => {
    const urlPattern = /http[s]?:\/\/codeforces\.com\/gym\/(\d+)\/standings/;
    const currentUrl = window.location.href;
    const match = urlPattern.exec(currentUrl);
    if (match) {
      const gymId = match[1];
      console.log("Found Gym ID: " + gymId);
      return gymId;
    }
    return "";
  }

;(function () {
  'use strict'
  $('span.verdict-format-judged').remove();
  $('#showUnofficial:checked').click();
  $('a[title="Participants solved the problem"]').remove();
  $('th:contains("Time")').remove();
  $('th:contains("Memory")').remove();
  $('td.time-consumed-cell').remove();
  $('td.memory-consumed-cell').remove();
  const standingsTable = $('table.standings tbody');
  const statisticsRow = $('tr.standingsStatisticsRow');
  const acChildrens = statisticsRow.find('span.cell-passed-system-test.cell-accepted');
  const smallers = statisticsRow.find('td.smaller.bottom');
  smallers.each((idx, el) => {
    el.classList.remove('smaller');
  });
  standingsTable.prepend(statisticsRow);
  acChildrens.each(function (index, element) {
    element.style.fontSize = "15px";
    element.style.fontWeight = "bold";
  });
  const gymId = getGymId();
  if (gymId !== "") {
    obtainSelfGymData(gymId).then(res => {
      if (res.length >= 2) {
        insertTableRow(res[1], res[0]); // Insert the row based on your criteria
      }

    }).catch(err => {
      console.error(err)
    });
  }
})()


// @match        https://codeforces.com/problemset
// @match        https://codeforces.com/contest/*
// @match        https://codeforces.com/gym/*
// @match        https://codeforces.com/profile/*
// @match        https://codeforces.com/problemset/page/*
// @match        http://codeforces.com/problemset
// @match        http://codeforces.com/contest/*
// @match        http://codeforces.com/gym/*
// @match        http://codeforces.com/profile/*
// @match        http://codeforces.com/problemset/page/*
