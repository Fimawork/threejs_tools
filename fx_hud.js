const targetId = "fx_loading_effect";

// 1. 建立效果對映表 (Strategy Map)
const loadingEffects = {
    "A": InstLoadingEffect_Type_A,
    "B": InstLoadingEffect_Type_B,
    "C": InstLoadingEffect_Type_C,
    // 未來擴充直接在這裡加：
    // "D": InstLoadingEffect_Type_D,
};

// 2. 簡化後的 Manager
export function LoadingEffectManager(type, show) 
{
    const effect = loadingEffects[type];

    if (effect) 
    {
        effect(show);
    } 
    
    else 
    {
        console.warn(`[LoadingEffectManager] 未知的載入類型: ${type}`);
    }
}

export function InstLoadingEffect_Type_A(show)
{
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

export function InstLoadingEffect_Type_B(show)
{
    let target = document.getElementById(targetId);

    if(show)
    {
        if (target) return;

        let spinner = document.createElement("div");

        // 2. 用物件直接賦予它所有的 CSS 靜態樣式
        Object.assign(spinner.style, {
            width: '80px',
            height: '80px',
            border: '2px solid rgba(255, 59, 48, 0.1)',
            borderTop: '2px solid rgb(255, 255, 255)', 
            borderRadius: '50%',
            position: 'absolute',
            top:'50%',
            left:'50%',
            marginLeft: '-40px', // 寬度的一半 (80 / 2)
            marginTop: '-40px',  // 高度的一半 (80 / 2)
            zIndex: '99',
            transition: 'opacity 0.3s ease' // 統一修正轉場時間為 0.3 秒
        });
      
        // 3. 用 Web Animations API 加上 1 秒無限旋轉的動畫 (代替 @keyframes)
        spinner.animate([
            { transform: 'rotate(0deg)' },
            { transform: 'rotate(360deg)' }
          ], {
            duration: 1000,      // 1s
            easing: 'linear',    // linear
            iterations: Infinity // infinite
          });
        
        spinner.setAttribute("id", targetId);
        document.body.append(spinner);
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

export function InstLoadingEffect_Type_C(show)
{
    let target = document.getElementById(targetId);

    if (show)
    {
        if (target) return;

        // 1. 建立外層容器（作為中央定位與管理）
        let container = document.createElement("div");
        container.setAttribute("id", targetId);

        Object.assign(container.style, {
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '100px',
            height: '100px',
            zIndex: '9999',
            pointerEvents: 'none',
            transition: 'opacity 0.3s ease',
            opacity: '1'
        });

        // 2. 建立波紋圓環的核心樣式範本
        const createRipple = (delay) => {
            let ring = document.createElement("div");
            Object.assign(ring.style, {
                position: 'absolute',
                top: '0',
                left: '0',
                width: '100%',
                height: '100%',
                borderRadius: '50%',
                border: '2px solid rgba(255, 255, 255, 0.8)',
                boxSizing: 'border-box'
            });

            // 使用 Web Animations API (WAAPI) 加上脈衝放大與淡出動畫
            ring.animate([
                { transform: 'scale(0.1)', opacity: 1 },
                { transform: 'scale(1.2)', opacity: 0 }
            ], {
                duration: 1500,
                easing: 'cubic-bezier(0.215, 0.61, 0.355, 1)', // Smooth Out
                iterations: Infinity,
                delay: delay // 錯開時間形成雙環波紋
            });

            return ring;
        };

        // 建立兩個交錯時間的波紋圓環（錯開 0.75 秒）
        container.appendChild(createRipple(0));
        container.appendChild(createRipple(750));

        document.body.appendChild(container);
    }
    else
    {
        if (!target) return;

        // 淡出離場動畫 (0.3秒)
        target.style.transition = "opacity 0.3s ease";
        target.style.opacity = "0";

        let called = false;
        const onEnd = () => {
            if (called) return;
            called = true;
            target.remove();
        };

        // 正常狀況：Transition 結束後移除 DOM
        target.addEventListener("transitionend", onEnd, { once: true });
        
        // 保險狀況：防止轉場事件沒觸發 (350ms 略大於轉場 0.3s)
        setTimeout(onEnd, 350);
    }
}