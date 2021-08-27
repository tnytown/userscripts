// ==UserScript==
// @name     zybooks
// @include	 https://learn.zybooks.com/*
// @version  1
// @grant    none
// @run-at   document-end
// ==/UserScript==

const st = unsafeWindow.st = {};

const wait = (ms) => new Promise((ok, err) => setTimeout(ok, ms));

const step = () => wait(Math.random() * 5000 + 1500);

async function solveAnimation(act) {
    let e = act.element;
    console.log("solveAnimation()", e);

    let ctrls = e.querySelector(".animation-controls");

    ctrls.querySelector(".speed-control input").click();
    //console.log("start button", e.querySelectorAll(".start-button"));
    //ctrls.querySelector(".start-button").click();

    let promise = new Promise(resolve =>
        act.addObserver("isPlayingAnimation", async () => {
            //console.log(e, act.isPlayingAnimation);
            if(act.isPlayingAnimation) return;

            await wait(100);
            if(!act.isCompleted) try { act.play(); } catch { resolve(); }
            else resolve();
        }));

    act.playFromStart();
    await promise;
}

async function solveMultipleChoice(act) {
    let e = act.element;
    console.log("solveMultipleChoice()", e);


    let r = Array.from(e.queryComponentAll(".question-set-question.multiple-choice-question").map(x => x.item.choices.map((y, n) => {return {y, n}}).filter(z => z.y.correct)[0]).map(x => x.n));
    console.log(r);


    let qs = e.querySelectorAll(".question-set-question");
    for(let [q, a] of r.entries()) {
        await step();
        let as = qs[q].querySelectorAll("div.zb-radio-button > input");
        as[a].click();
    }
}

async function solveShortAnswer(act) {
    let e = act.element;
    console.log("solveShortAnswer()", e);

    let r = e.queryComponentAll(".question-set-question.short-answer-question");
    for(let q of r) {
        let input = q.element.querySelector("textarea");
        let submit = q.element.querySelector(".check-button");
        console.log(input, "q.element");

        input.focus();
        input.value = q.question.answers[0];

        await step();

        submit.focus();
        await wait(100); // TODO: why is this required?
        submit.click();
    }
}

async function solveCustomContentResource(act) {
    console.log("solveCustomContentResource()", act);

    let promise = !act.isRenderingResource ? Promise.resolve() :  new Promise(resolve => act.addObserver("isRenderingResource", async () => {
        if(!act.isRenderingResource) resolve();
    }));

    let promise1 = act.checkToolLoaded.isIdle && act.checkToolLoaded.performCount > 0 ? Promise.resolve() : new Promise(resolve =>
        act.checkToolLoaded.addObserver("isIdle", async () => {
            if(act.checkToolLoaded.isIdle && act.checkToolLoaded.performCount > 0) resolve();
        }));

    await Promise.all([promise1, promise]);



    let e = act.element;
    let res = act.resource;
    let pt = res.toolInstance.progressionTool;

    pt.startButtonClick();

    let ansbox = e.querySelector(".IO-container > .console");
    do {
        await step();
        let part = res.firstIncompletePart;
        console.log("-> solving problem", part);
        pt.jumpToLevelIndex(part);

        await act.resource.toolInstance.currentQuestion.serverRequestPromise;

        //console.log(JSON.stringify(act.resource.toolInstance.currentQuestion));

        console.log(`solution: ${act.resource.solution}`);

        ansbox.value = res.solution;
        pt.checkButtonClick();

        while(res.firstIncompletePart === part)
            await wait(500);
    } while(res.firstIncompletePart > 0);
}

async function dispatchSolve(acts) {
    let act = acts.shift();
    if(!act) return;

    let e = act.element, pl = e.queryComponentAll(".content-resource")[0];

    console.log("dispatchSolve: current component is", pl);

    if(!e.querySelector(".large.check.filled"))
        if(e.matches(".animation-player-content-resource")) await solveAnimation(pl);
    else if(e.matches(".multiple-choice-content-resource")) await solveMultipleChoice(pl);
    else if(e.matches(".challenge.custom-content-resource")) await solveCustomContentResource(pl);
    else if(e.matches(".short-answer-content-resource")) await solveShortAnswer(pl);

    console.log(`dispatchSolve: ${acts.length} remaining`);
    return await dispatchSolve(acts);
}

function queryComponentAll(sel) {
    let obj = this;

    if(obj.elementId) obj = document.getElementById(obj.elementId);
    if(!obj.__proto__.querySelector) obj = document;

    return Array.from((obj).querySelectorAll(`.ember-view ${sel}`))
        .map(x => st.app.__container__.lookup("-view-registry:main")[x.id]);
}

function queryComponent(sel) {
    return queryComponentAll(sel)[0];
}

async function dispatch(e) {
    console.log(`dispatch() on route ${e.targetName}`);
    switch(e.targetName) {
    case "zybook.chapter.section":

        const pa = queryComponentAll(".participation"), ca = queryComponentAll(".challenge");
        const sec = st.lookup("controller:zybook/chapter/section").currentAssignmentSection;

        const acts = [...(sec.include_participations > 0 ? pa : []), ...(sec.include_challenges > 0 ? ca : [])];

        let gecs = document.querySelector("#gecs100");
        if(!gecs) {
            button = document.createElement("div");
            button.id = "gecs100";
            button.style.position = "fixed";
            button.style.bottom = "0";
            button.onclick = () => dispatchSolve(acts);
            button.innerText = "click 2 gec";
            button.style.color = "red";
            button.style.cursor = "pointer";
            button.style["font-size"] = "1.5em";
            button.style["background-color"] = "orange";
            document.body.appendChild(button);
        } else {
            gecs.removeEventListener("click", button.onclick);
            gecs.onclick = () => dispatchSolve(acts);
        }

        //await dispatchSolve(acts);
        break;
    case "zybook.chapter.section_loading": break;
    }
}

function getApplication() {
    st.Ember = unsafeWindow.Ember;
    let namespaces = st.Ember.Namespace.NAMESPACES;

    return namespaces.find(ns => (ns instanceof st.Ember.Application));
}

function hookProtos() {
    HTMLElement.prototype.queryComponent = queryComponent;
    HTMLElement.prototype.queryComponentAll = queryComponentAll;
}

async function main() {
	const app = getApplication();
    console.log(app);

    hookProtos();

    st.app = app;
    st.router = app.__container__.lookup("router:main")
    st.lookup = st.app.__container__.lookup.bind(st.app.__container__);
    st.queryComponentAll = queryComponentAll;

    Ember.run.scheduleOnce("afterRender", this, () => {
        st.router.on("routeDidChange", e => Ember.run.scheduleOnce("afterRender", st, e => wait(1000).then(() => dispatch(e)), e));
    });
}


window.addEventListener("DOMContentLoaded", main);
