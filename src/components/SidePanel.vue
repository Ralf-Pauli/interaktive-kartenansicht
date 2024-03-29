<template>
  <div id="sidePanel" aria-hidden="false" aria-label="side panel" class="sidepanel">
    <div class="sidepanel-inner-wrapper">
      <nav aria-label="sidepanel tab navigation" class="sidepanel-tabs-wrapper">
        <ul class="sidepanel-tabs">

          <li class="sidepanel-tab">
            <a class="sidebar-tab-link" data-tab-link="tab-1" href="#" role="tab">
              <span class="material-symbols-sharp">warning</span>
            </a>
          </li>

          <li class="sidepanel-tab">
            <a class="sidebar-tab-link" data-tab-link="tab-2" href="#" role="tab">
              <span class="material-symbols-sharp">coronavirus</span>
            </a>
          </li>

          <li class="sidepanel-tab">
            <a class="sidebar-tab-link" data-tab-link="tab-3" href="#" role="tab">
              <span class="material-symbols-sharp">thunderstorm</span>
            </a>
          </li>

          <li class="sidepanel-tab">
            <a class="sidebar-tab-link" data-tab-link="tab-4" href="#" role="tab">
              <span class="material-symbols-sharp">flood</span>
            </a>
          </li>

          <!-- [...] -->
        </ul>
      </nav>
      <div class="sidepanel-content-wrapper">
        <div class="sidepanel-content w-full h-full">

          <div class="sidepanel-tab-content" data-tab-content="tab-1">
            <h2 class=" text-2xl text-center font-bold mb-3">{{ titles[0] }}</h2>

            <div v-if="isLoading">
              <LoadingWarning></LoadingWarning>
            </div>
            <div v-else-if="coronaWarnings.size > 0" class="mt-5 flex flex-col">
              <Warning v-for="(warn) in generalWarnings.values()" :id="warn.identifier" :warning="warn"
                       class="flex flex-col mb-2 pb-2 gap-2 border-b "/>
            </div>
            <div v-else>
              <NoWarningsFound :symbol="symbolList[0]" :warn-type="titles[0]"/>
            </div>
          </div>

          <div class="sidepanel-tab-content w-full h-full" data-tab-content="tab-2">
            <h2 class="text-2xl text-center font-bold mb-3">{{ titles[1] }}</h2>

            <div v-if="isLoading">
              <LoadingWarning></LoadingWarning>
            </div>

            <div v-else-if="coronaWarnings.size > 0" class="mt-5 flex flex-col">
              <Warning v-for="(warn) in coronaWarnings.values()" :id="warn.identifier" :warning="warn"
                       class="flex flex-col mb-2 pb-2 gap-2 border-b"/>
            </div>

            <div v-else>
              <NoWarningsFound :symbol="symbolList[1]" :warn-type="titles[1]"/>

            </div>
          </div>

          <div class="sidepanel-tab-content w-full h-full" data-tab-content="tab-3">
            <h2 class="text-2xl text-center font-bold">{{ titles[2] }}</h2>
            <div v-if="isLoading">
              <LoadingWarning></LoadingWarning>
            </div>

            <div v-else-if="weatherWarnings.size > 0" class="mt-5 flex flex-col">
              <Warning v-for="warn in weatherWarnings.values()" :id="warn.identifier" :warning="warn"
                       class="flex flex-col mb-2 pb-2 gap-2 border-b"/>
            </div>

            <div v-else class="flex items-center justify-center flex-col ">
              <NoWarningsFound :symbol="symbolList[2]" :warn-type="titles[2]"/>
            </div>
          </div>

          <div class="sidepanel-tab-content w-full h-full" data-tab-content="tab-4">
            <h2 class="text-2xl text-center font-bold">{{ titles[3] }}</h2>
            <div v-if="isLoading">
              <LoadingWarning></LoadingWarning>
            </div>

            <div v-else-if="floodWarnings.size > 0" class="mt-5 flex flex-col">
              <Warning v-for="warn in floodWarnings.values()" :id="warn.identifier" :warning="warn"
                       class="flex flex-col mb-2 pb-2 gap-2 border-b"/>
            </div>

            <div v-else class="flex items-center justify-center flex-col ">
              <NoWarningsFound :symbol="symbolList[3]" :warn-type="titles[3]"/>
            </div>
          </div>

        </div>
      </div>
    </div>

    <div class="sidepanel-toggle-container">
      <button ref="sidebarBtn" aria-label="toggle side panel" class="sidepanel-toggle-button" type="button"></button>
    </div>
  </div>
</template>

<script setup>

import LoadingWarning from "./LoadingWarning.vue"
import Warning from "./Warning.vue"
import {onMounted, ref} from "vue";
import NoWarningsFound from "@/components/NoWarningsFound.vue";
import {baseURL, proxyURL} from "@/utils/geoJsonHandler";
import {addError} from "@/utils/ErrorHandler";

let warningGeo = [[], [], [], []];

let warnings = new Map(),
    coronaWarnings = ref(new Map()),
    weatherWarnings = ref(new Map()),
    floodWarnings = ref(new Map()),
    generalWarnings = ref(new Map()),
    allWarnings = new ref([]);

let symbolList = ["warning", "coronavirus", "thunderstorm", "flood"]
let titles = ["Allgemeinen Warnmeldungen", "Coronawarnungen", "Unwetterwarnungen", "Flutwarnungen"];

let props = defineProps(["warningGeo", "allWarnings"])
let emit = defineEmits(["update:warningGeo", "update:allWarnings"])

onMounted(() => {
  getWarnings();
})

let isLoading = ref(false);

async function getWarnings() {
  let responses;
  try {
    isLoading.value = true;
    responses = await Promise.allSettled(["katwarn", "biwapp", "mowas", "dwd", "lhp"].map(async source => [
      await fetch(proxyURL + baseURL + `/${source}/mapData.json`, {cache: "reload"}).then(res => res.json()),
    ]));

    isLoading.value = false;

    responses.forEach(response => {
      if (response.value[0].length !== 0) {
        response.value[0].forEach(warning => {
          let id = warning.id;
          delete warning.id;
          warnings.set(id, warning);
        });
      }

    });
    await setWarningDetails();
  } catch (e) {
    addError(new Error("Warnungen konnten nicht abgerufen werden", {cause: e}))
  }
}

async function setWarningDetails() {
  try {
    for (let key of warnings.keys()) {
      await fetch(proxyURL + baseURL + `/warnings/${key}.json`).then(res => {
        if (!res.ok) {
          throw new Error("Error: " + res.status, {cause: res});
        }
        return res.json();
      }).then(value => {
        value.severity = warnings.get(value.identifier).severity;
        if (value.info[0].web !== undefined) {
          value.info[0].web = value.info[0].web.split("\n");
          for (let i = 0; i < value.info[0].web.length; i++) {
            if (!value.info[0].web[i].includes("https://") && !value.info[0].web[i].includes("http://")) {
              value.info[0].web[i] = "https://" + value.info[0].web[i];
            }
          }
        }
        switch (key.substring(0, 3)) {
          case "dwd":
            weatherWarnings.value.set(key, value);
            break;

          case "lhp":
            floodWarnings.value.set(key, value);
            break;

          default:
            generalWarnings.value.set(key, value);
            break;
        }
        allWarnings = [generalWarnings.value, coronaWarnings.value, weatherWarnings.value, floodWarnings.value];
      }).catch(e => {
        addError(new Error("Es konnten keine Warnungs Details konnten abgerufen werden", {cause: e}))
      });
    }

    generalWarnings.value.forEach((value, key) => {
      if (value.info[0].headline.toLowerCase().includes("corona" || "covid")) {
        coronaWarnings.value.set(key, value);
        generalWarnings.value.delete(key);
      }
    });
    emit("update:allWarnings", allWarnings);
    await getWarningGeoJSON();
  } catch (e) {
    addError(new Error("Warnungen konnten nicht aufgeteilt werden", {cause: e}))
  }
}

async function getWarningGeoJSON() {
  // warningGeoJSONs
  try {
    for (let index in allWarnings) {
      let geoJSONS = []
      for (let warning of allWarnings[index]) try {
        geoJSONS.push(await fetch(proxyURL + baseURL + `/warnings/${warning[0]}.geojson`).then(res => res.json()));
      } catch (e) {
        addError(new Error("GeoJSON Informationen konnten nicht abgerufen werden", {cause: e}))
      }
      warningGeo[index].push(geoJSONS)
    }
    emit("update:warningGeo", warningGeo);
  } catch (e) {
    addError(new Error("GeoJSON Informationen konnten nicht abgerufen werden", {cause: e}))
  }
}
</script>

<style scoped>

</style>