window.DC = window.DC || {};
(function(DC){
"use strict";
function icon(name,size){size=size||18;return '<svg class="ic" width="'+size+'" height="'+size+'"><use href="#i-'+name+'"/></svg>';}
function setUse(el,name){if(el)el.innerHTML='<use href="#i-'+name+'"/>';}
function hydrate(root){(root||document).querySelectorAll("[data-icon]").forEach(function(el){el.innerHTML=icon(el.getAttribute("data-icon"),el.getAttribute("data-size")||18);});}
DC.icons={icon:icon,setUse:setUse,hydrate:hydrate};
})(window.DC);
