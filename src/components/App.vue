<script setup lang="ts">
import { Network } from 'vis-network';
import { onMounted, ref, watch } from 'vue';
import { Connection, ConnectionType, Entity, EntityType } from '../util/types';
import ExportImportManager from './ExportImportManager.vue';

const entities = ref<Entity[]>([]);
const connections = ref<Connection[]>([]);

const newName = ref('');
const newType = ref<EntityType>(EntityType.PERSON);
const fromId = ref('');
const toId = ref('');
const connectionType = ref<ConnectionType>(ConnectionType.ONE_WAY);
const networkContainer = ref<HTMLElement | null>(null);
let network: Network;

const renderNetwork = () => {
  if (!networkContainer.value) return;

  const nodes = entities.value.map(p => {
    return {
      id: p.id,
      label: p.name,
      group: p.type,
    };
  });

  const edges = connections.value.map(c => ({
    from: c.from,
    to: c.to,
    arrows: c.type === 'one-way' ? 'to' : 'to, from',
  }));

  if (network) {
    network.destroy();
  }

  network = new Network(networkContainer.value, { nodes, edges }, {
    layout: {
      /*hierarchical: {
        direction: "UD",
        sortMethod: "directed",
      },*/
    },
    physics: {
      enabled: true,
    },
    groups: {
      [EntityType.PERSON]: {
        color: "#6181b8",
        font: {
          color: '#def',
        },
      },
      [EntityType.GROUP]: {
        color: "#936",
        font: {
          color: '#fde',
        },
      },
    },
  });
  network.on('doubleClick', (e) => {
    if (e.nodes.length === 1) {
      const [nodeId] = e.nodes;
      const entity = entities.value.find(p => p.id === nodeId);
      const newName = prompt('Enter new name for node '+nodeId, entity?.name);
      if (newName && newName !== entity?.name) {
        entities.value = entities.value.map(entity => entity.id === nodeId ? {...entity, name: newName} : entity);
      }
    }
  })
};

const addEntity = () => {
  if (!newName.value.trim()) return;
  const id = 'p' + Date.now();
  entities.value = [
    ...entities.value,
    { id, name: newName.value.trim(), type: newType.value },
  ];
  newName.value = '';
};

const addConnection = () => {
  if (fromId.value && toId.value && fromId.value !== toId.value) {
    connections.value = [
      ...connections.value,
      { from: fromId.value, to: toId.value, type: connectionType.value },
    ];
  }
};

const setConnections = (newConnections: Connection[]) => {
  console.debug('setConnections', newConnections);
  connections.value = newConnections;
};

const setEntities = (newEntities: Entity[]) => {
  console.debug('setEntities', newEntities);
  entities.value = newEntities;
};

onMounted(() => {
  renderNetwork();
  document.body.addEventListener('keyup', (e) => {
    if (e.key === 'Delete') {
      const edges = network.getSelectedEdges();
      if (edges.length > 0) {
        edges.forEach(edge => {
          const connectedNodes = network.getConnectedNodes(edge);
          if (connectedNodes.length === 2) {
            connections.value = connections.value.filter(connection => !(
                (connection.from === connectedNodes[0] && connection.to === connectedNodes[1])
                || (connection.from === connectedNodes[1] && connection.to === connectedNodes[0])
            ));
          }
        });
      }
      else {
        const nodes = network.getSelectedNodes();
        if (nodes.length > 0) {
          entities.value = entities.value.filter(entity => !nodes.includes(entity.id));
        }
      }
    }
  });
});

watch([entities, connections], renderNetwork);
</script>

<template>
  <div id="controls">
    <h1>People Network</h1>

    <form @submit.prevent="addEntity">
      <input v-model="newName" placeholder="Name" required />
      <select v-model="newType" required>
        <option v-for="p in EntityType" :key="p" :value="p">{{ p }}</option>
      </select>
      <button>Add Entity</button>
    </form>

    <form @submit.prevent="addConnection">
      <select v-model="fromId">
        <option v-for="p in entities" :key="p.id" :value="p.id">{{ p.name }}</option>
      </select>
      <select v-model="toId">
        <option v-for="p in entities" :disabled="p.id === fromId" :key="p.id" :value="p.id">{{ p.name }}</option>
      </select>
      <select v-model="connectionType">
        <option v-for="p in ConnectionType" :key="p" :value="p">{{ p }}</option>
      </select>
      <button>Add Connection</button>
    </form>

    <ExportImportManager
        :connections="connections"
        :entities="entities"
        @update:connections="setConnections"
        @update:entities="setEntities"
    />
  </div>
  <div ref="networkContainer" id="network-container"></div>
</template>
