export function InstLoadingEffect_Type_A(show)
{
    const targetId = "fx_loading_effect";
    let target = document.getElementById(targetId);

    if(show)
    {
        if (target) return;

        let div_main = document.createElement("div");
        div_main.style.opacity = "1";
        div_main.setAttribute("id", targetId);
        document.body.append(div_main);

        let div_logo_wrapper = document.createElement("div");
        div_logo_wrapper.setAttribute("class", "logo-wrapper");
        div_main.append( div_logo_wrapper );

        let thisImg = document.createElement("img");
        thisImg.setAttribute("class","loading_logo");
        thisImg.setAttribute("alt","fimawork Logo");
        thisImg.src="https://cdn.jsdelivr.net/gh/Fimawork/threejs_tools/images/fimawork_logo_white.png";
        div_logo_wrapper.append( thisImg );

        let div_logo_text = document.createElement("div");
        div_logo_text.setAttribute("class","loading-text");
        div_logo_text.textContent = "Loading";
        div_main.append( div_logo_text );

        let div_progress_bar_container = document.createElement("div");
        div_progress_bar_container.setAttribute("class","progress-bar-container");
        div_main.append( div_progress_bar_container );

        let div_progress_bar = document.createElement("div");
        div_progress_bar.setAttribute("class","progress-bar");
        div_progress_bar_container.append( div_progress_bar );
    }

    else
    {
        if (!target) return;

        // 1. 用 CSS 讓透明度在 0.2 秒內平滑過渡
        target.style.transition = "opacity 1s ease";
        target.style.opacity = "0";

        let called = false;
        const onEnd = () => {
            if (called) return;
            called = true;
            target.remove();
        };

        // 正常狀況：動畫結束時刪除
        target.addEventListener("transitionend", onEnd, { once: true });
            
        // 保險狀況：如果 250 毫秒後（比動畫的 0.2s 稍長）動畫沒觸發，強行刪除
        setTimeout(onEnd, 1050);
    }
    
}