// ==UserScript==
// @name         wfcf
// @version      1.0
// @description  To simulate icpc
// @author       hocky
// @match        https://codeforces.com/*
// @match        http://codeforces.com/*
// @grant        none
// ==/UserScript==

const selfHandle = "trap"
const logURL = "https://raw.githubusercontent.com/hockyy/wfcf/main/logs.txt"
let frozenDuration = 3600 * 4;
// Set the date and time in local time zone (GMT+7)
const startEpoch = (new Date('2023-10-16T11:25:00+07:00')).getTime();

function deepClone(obj) {
    return JSON.parse(JSON.stringify(obj));
}

function splitWithTail(s, delim, lim){
    let res = s.split(delim);
    let result = [];
    let rest = "";
    for(let i = 0;i < Math.min(res.length, lim - 1);i++) result.push(res[i]);
    for(let i = lim - 1;i < res.length;i++) {
        if(rest) rest += delim;
        rest += res[i];
    }
    if(rest) {
        result.push(rest);
    }
    return result;
}

function createUniversityTableRow(universityData, idx) {
    const tr = document.createElement('tr');
    tr.setAttribute('participantid', universityData[0]);

    // Create the table cells
    const cells = [
        createTableCell(idx, 'left'), // Rank
        createContestantCell({name: universityData.name}, ''), // Team and Members
        createTableCell(universityData.frozen.ok, ''), // Points
        createTableCell(universityData.frozen.penalty, ''), // Penalty
    ];
    // Add the problem result cells
    universityData.problems.forEach((result, problemIdx) => {
        const frozenAttempt = universityData.frozen.problemsAttempt[problemIdx];
        const unfrozenAttempt = universityData.unfrozen.problemsAttempt[problemIdx];
        const pendingString = `${frozenAttempt} + ${unfrozenAttempt - frozenAttempt} ${getTriesText(unfrozenAttempt)}`
        const problemCell = createProblemResultCellICPC(result, false, pendingString);
        cells.push(problemCell);
    });

    // Append cells to the row
    cells.forEach(cell => tr.appendChild(cell));

    return tr;
}

const universities = [{}];
const universitiesData = [];
let problems = [];

const simulateGhosts = async () => {

    // return fetch(logURL, {cache: "no-cache"})
    return fetch(logURL)
        .then(response => response.text())
        .then(data => {
        // Split the data into an array of lines
        const lines = data.split('\n');
        const now = Date.now(); // Unix timestamp in millisecondsc
        const durationPassed = (now - startEpoch) / 1000;

        // Loop through the lines to parse the data
        for (const line of lines) {
            // Split each line by comma to get individual data points
            const parts = splitWithTail(line, ' ', 2);
            if (parts[0] === '@t') {
                // This line contains university data
                const splittedData = splitWithTail(parts[1],',', 4);
                universities.push({
                    index: universities.length,
                    name: splittedData[3],
                    problems: Array(problems.length).fill(0),
                    unfrozen: {
                        ok: 0,
                        penalty: 0,
                        problemsAttempt: Array(problems.length).fill(0),
                    },
                    frozen: {
                        ok: 0,
                        penalty: 0,
                        problemsAttempt: Array(problems.length).fill(0),
                    },
                });
            } else if (parts[0] === '@s') {
                const splittedData = splitWithTail(parts[1],',', 5);
                const universityIndex = parseInt(splittedData[0]);
                const problem = splittedData[1].charCodeAt(0) - 'A'.charCodeAt(0);
                const attempts = parseInt(splittedData[2]);
                const time = parseInt(splittedData[3]);
                const verdict = splittedData[4];
                if(time > durationPassed) break;
                const currentUniversity = universities[universityIndex];
                const submissionObject = {attempts: attempts, time: time, verdict: verdict};
                if(currentUniversity.problems[problem] && currentUniversity.problems[problem].verdict === "OK"){
                    continue;
                }
                currentUniversity.unfrozen.problemsAttempt[problem]++;
                if(submissionObject.verdict === "OK"){
                    if(submissionObject.time < problems[problem].firstSolver){
                        problems[problem].firstSolver = submissionObject.time;
                        submissionObject.firstSolve = true;
                    }
                    currentUniversity.unfrozen.ok++;
                    currentUniversity.unfrozen.penalty += submissionObject.time / 60 + (submissionObject.attempts - 1) * problems[problem].penalty;
                }
                if(time <= frozenDuration){
                    currentUniversity.frozen = deepClone(currentUniversity.unfrozen);
                }
                currentUniversity.problems[problem] = submissionObject;
            } else if(parts[0] === "@p"){
                const splittedData = splitWithTail(parts[1], ',', 4);
                problems.push({
                    letter: splittedData[0],
                    title: splittedData[1],
                    penalty: parseInt(splittedData[2]),
                    firstSolver: 999999999999
                });
            }
        }

        universities.splice(0, 1);
        // Now 'universitiesData' holds university information, and 'universities' holds problem results for each university.
        // Sort universities by points in descending order and then by penalty in ascending order
        universities.sort((a, b) => {
            if(a.frozen.ok !== b.frozen.ok) return b.frozen.ok - a.frozen.ok;
            return a.frozen.penalty - b.frozen.penalty;
        });
        // Create a table row for each university and append it to the table
        const tbody = $('table.standings tbody');
        universities.forEach((universityData, idx) => {
            const universityTableRow = createUniversityTableRow(universityData, idx + 1);
            tbody.append(universityTableRow);
        });

        return 1;
    })
        .catch(error => {
        console.error("Error fetching data:", error);
    });

};

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
    data.problemResults.forEach((result, idx) => {
        const isFirstSolve = (result.points === 1 && result.bestSubmissionTimeSeconds <= problems[idx].firstSolver);
        const problemCell = createProblemResultCellICPC({
            verdict: result.points === 1 ? "OK" : "RJ",
            attempts: result.rejectedAttemptCount + result.points,
            time: result.bestSubmissionTimeSeconds,
            firstSolve: isFirstSolve
        }, true);
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

function getTriesText(attempts){
    return `tr${attempts === 1 ? 'y' : 'ies'}`;
}

function attemptText(result){
    return `${result.attempts} ${getTriesText(result.attempts)}`;
}

function createProblemResultCellICPC(result, selfEntry = false, pendingString = "") {
    const td = document.createElement('td');
    if(!result) {
        td.innerHTML = `<span class="cell-rejected"></span>`
    } else if((selfEntry || result.time <= frozenDuration) && result.attempts > 0){
        if (result.verdict === "RJ") {
            td.innerHTML = attemptText(result);
            td.style.backgroundColor = '#e87272';
        } else if(result.verdict === "OK") {
            const acceptedSpan = document.createElement('div');
            acceptedSpan.style.fontSize = '11px';
            acceptedSpan.textContent = attemptText(result);
            const timeSpan = document.createElement('div');
            timeSpan.style.fontSize = '15px';

            // Assuming time is in the format "hh:mm"
            timeSpan.textContent = Math.floor(result.time/60);
            td.appendChild(timeSpan);
            td.appendChild(acceptedSpan);
            td.style.backgroundColor = '#60e760';
            if(result.firstSolve) td.style.backgroundColor = '#1daa1d';
            if(result.firstSolve && selfEntry) td.style.backgroundColor = '#fae900';
        }
    } else if(result.attempts > 0) {
        td.innerHTML = `<span style="font-size: 10px">${pendingString}</span>`
        td.style.backgroundColor = '#66f';

    }
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

    if(party.country){
        // Create the flag image
        const flagImg = document.createElement('img');
        flagImg.classList.add('standings-flag');
        flagImg.src = `//codeforces.org/s/84141/images/flags-16/id.png`;
        flagImg.alt = party.country;
        flagImg.title = party.country;
        span.appendChild(flagImg);
    }

    if (party.teamName) {
        const teamLink = document.createElement('a');
        teamLink.href = `/team/${party.teamId}`;
        teamLink.title = party.teamName;
        teamLink.textContent = party.teamName + ': ';
        span.appendChild(teamLink);
    }

    if(party.members){
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
    }

    if(party.teamId){
        // Add the virtual participant link
        const sup = document.createElement('sup');
        sup.style.marginLeft = '0.25em';
        sup.style.fontSize = '8px';
        const participantLink = document.createElement('a');
        participantLink.href = `/gym/${party.contestId}/standings/participant/${party.teamId}#p${party.teamId}`;
        participantLink.textContent = '#';
        sup.appendChild(participantLink);
        span.appendChild(sup);
    }

    if(party.name){
        const ghostLogo = document.createElement('div');
        td.appendChild(ghostLogo);
        ghostLogo.outerHTML = '<img style="vertical-align:middle;" src="/images/icons/ghost.png" title="Ghost participant" alt="Ghost participant">'
        span.setAttribute('title', 'Ghost Participant');
        span.appendChild(document.createTextNode(party.name.replaceAll("\"", "")));
    }

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
    const urlPattern = /http[s]?:\/\/codeforces\.com\/gym\/(\d+)\/standings\/friends/;
    const currentUrl = window.location.href;
    const match = urlPattern.exec(currentUrl);
    if (match) {
        const gymId = match[1];
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
    $('table.status-frame-datatable tbody tr th:contains("#")').remove();
    $('tr[data-submission-id] td.id-cell').remove();
    $('a:contains("Status")').remove();
    $('a:contains("Standings")').attr('href', function(i, currentHref) {
        return currentHref + '/friends/true';
    });
    $('a:contains("Standings")').text('Frozen Standings');
    $('a:contains("Friends standings")').text('Frozen Standings');
    $('td.time-consumed-cell').remove();
    $('td.memory-consumed-cell').remove();

    const gymId = getGymId();
    if (gymId !== "") {
        $('table.standings tbody tr[participantid]').remove();
        simulateGhosts().then(() => {
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
            obtainSelfGymData(gymId).then(res => {
                if (res.length >= 2) {
                    insertTableRow(res[1], res[0]); // Insert the row based on your criteria
                }

            }).catch(err => {
                console.error(err)
            });
        })
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
