// 抖音
getcomments = () => {
    let list = document.querySelectorAll('[data-e2e="comment-level-1"]')
    let ans = [];
    for (let i = 0, len = list.length; i < len; i++) {
        let child = list[i];
        ans.push(child.innerText)
    }
    fetch('http://localhost:8090/tiktokcomments?save=1', {
        method: 'POST',
        body: JSON.stringify(ans),
        headers: { "Content-Type": "application/json" }
    }).then(rsp => rsp.json())
        .then(data => {
            console.log(data);
        })
        .catch(e => {
            console.log("错误！");
        })
}