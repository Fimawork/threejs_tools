export function InstLoadingEffect_Type_A()
{
    let div_main = document.createElement("div");
    div_main.setAttribute("id", "fx_loading_effect");
    document.body.append(div_main);

    let div_logo_wrapper = document.createElement("div");
    div_logo_wrapper.setAttribute("class", "logo-wrapper");
    div_main.append( div_logo_wrapper );

    let thisImg = document.createElement("img");
    thisImg.setAttribute("class","loading_logo");
    thisImg.setAttribute("alt","fimawork Logo");
    thisImg.src="https://cdn.jsdelivr.net/gh/Fimawork/threejs_tools/fimawork_logo_white.png";
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