<script>
	import Map from './Map.svelte';
</script>


<Map />

<!--<div class="title-box">-->
<!--    <h1>Civilian Harm in Ukraine</h1>-->
<!--    <p>-->
<!--        Incidents of civilian harm in Ukraine during the Russian invasion in 2022-->
<!--    </p>-->
<!--    <div>Data source: <a href="https://ukraine.bellingcat.com/" target="_blank">Bellingcat</a></div>-->
<!--    <div>Code: <a href="https://github.com/ilyabo/ukraine-civilian-harm/" target="_blank">GitHub repo</a></div>-->
<!--</div>-->

<div id="info">
    <div class="header">
        <div class="chevron"></div>
        <div class="title">Civilian Harm in Ukraine</div>
        <div class="chevron"></div>
    </div>
    <section id="info-body">
        <p class="desc">
            Incidents that have resulted in potential civilian impact or harm since Russia began its
            invasion of Ukraine in 2022.
            The incidents have been
            <a href="https://ukraine.bellingcat.com/" target="_blank">collected by Bellingcat researchers</a>.
            Included in the map are instances where civilian areas and infrastructure have been
            damaged or destroyed, where the presence of civilian injuries are visible and/or there
            is the presence of immobile civilian bodies.
        </p>
        <div>See also: <a href="https://observablehq.com/@ilyabo/bellingcat-civilian-harm-in-ukraine-beeswarm-timeline" target="_blank">by weapon and area type</a></div>
        <div>Data: <a href="https://ukraine.bellingcat.com/" target="_blank">Bellingcat</a></div>
        <div>Code: <a href="https://github.com/ilyabo/ukraine-civilian-harm/" target="_blank">GitHub repo</a></div>
    </section>
</div>

<style>

    #info {
        display: flex;
        flex-direction: column;
        background: rgba(20,20,30,0.75);
        border-radius: 5px;
        padding: 10px;
        position: absolute;
        max-width: 220px;
        top: 10px;
        left: 10px;
        box-shadow: 0px 0px 1px 1px rgba(100,100,120,0.75);
        overflow: hidden;
        cursor: pointer;
    }
    #info #info-body {
        font-size:  0.7rem;
        color: #fff;
        max-height: 0px;
        transition: max-height 0.5s;
    }
    #info:hover #info-body {
        max-height: 500px;
    }
    #info:hover .chevron {
        opacity: 0;
    }

    .header {
        text-align: center;
        width: 100%;
        display: flex;
        flex-direction: row;
        justify-content: center;
        align-items: center;
    }
    .header > *+* {
        margin-left: 10px;
    }
    .title {
        color: #f0f3f3;
        font-weight: bold;
        font-size: 0.8rem;
        text-align: center;
    }
    .desc {
        color: #a0a3a3;
    }
    .chevron {
        position: relative;
        display: block;
        opacity: 1;
        transition: opacity 0.5s;
        width: 14px;
        height: 15px;
        margin-top: 10px;
    }
    .chevron:before,
    .chevron:after {
        position:absolute;
        display:block;
        content:"";
        border:7px solid transparent;
    }
    .chevron:before {
        top:0;
        border-top-color:#a0a3a3;
    }
    .chevron:after {
        top:-3px;
        border-top-color:rgba(20,20,30,0.75);
    }

</style>