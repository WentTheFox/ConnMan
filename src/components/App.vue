<script setup lang="ts">
import type { Data, Edge, IdType, Node, Options } from 'vis-network';
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

const generatePersonId = () => 'p' + Date.now();
const generateConnectionId = () => window.crypto.randomUUID();

const mapEntityToNode = (p: Entity): Node => ({
  id: p.id,
  label: p.name,
  group: p.type,
});

const mapConnectionToEdge = (c: Connection): Edge => ({
  id: c.id,
  from: c.from,
  to: c.to,
  arrows: c.type === 'one-way' ? 'to' : 'to, from',
});

const renderNetwork = () => {
  if (!networkContainer.value) return;

  const nodes: Node[] = entities.value.map(mapEntityToNode);

  const edges: Edge[] = connections.value.map(mapConnectionToEdge);

  const networkData: Data = { nodes, edges };
  const networkOptions: Options = {
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
        shape: 'box',
        font: {
          color: '#fde',
        },
      },
    },
  };

  if (network) {
    network.setData(networkData);
    network.setOptions(networkOptions);
    return;
  }

  network = new Network(networkContainer.value, networkData, networkOptions);
  network.on('doubleClick', (e) => {
    if (e.nodes.length === 1) {
      const [nodeId] = e.nodes;
      const entityIndex = entities.value.findIndex(p => p.id === nodeId);
      if (entityIndex === -1) {
        console.warn(`Cannot find entity with id ${nodeId}`);
        return;
      }
      const entity = entities.value[entityIndex];
      const newName = prompt(`Enter new name for node ${nodeId}`, entity.name);
      if (newName && newName !== entity.name) {
        entities.value = entities.value.map(entity => entity.id === nodeId ? {
          ...entity,
          name: newName,
        } : entity);
      }
      return;
    }
    if (e.edges.length === 1) {
      const [edgeId] = e.edges;
      console.debug('edgeId', edgeId);
      const connection = connections.value.find(c => c.id === edgeId);
      if (!connection) {
        console.warn(`No connection with id ${edgeId}`);
        return;
      }
      switch (connection.type) {
        case ConnectionType.ONE_WAY:
          connections.value = connections.value.map(c => c.id === connection.id ? {
            ...connection,
            type: ConnectionType.BI_DIRECTIONAL,
          } : c);
          break;
        case ConnectionType.BI_DIRECTIONAL:
          connections.value = connections.value.map(c => c.id === connection.id ? {
            ...connection,
            type: ConnectionType.ONE_WAY,
          } : c);
          break;
      }
    }
  });
};

const sortByName = <T extends { name: string }>(a: T, b: T) => a.name.localeCompare(b.name);

const addEntity = () => {
  if (!newName.value.trim()) return;
  const id = generatePersonId();
  entities.value = [
    ...entities.value,
    { id, name: newName.value.trim(), type: newType.value },
  ].sort(sortByName);
  newName.value = '';
};

const addConnection = () => {
  if (fromId.value && toId.value && fromId.value !== toId.value) {
    connections.value = [
      ...connections.value,
      {
        id: generateConnectionId(),
        from: fromId.value,
        to: toId.value,
        type: connectionType.value,
      },
    ];
  }
};

const ensureConnectionHaveIds = (connections: Connection[]) => connections.map(c => c.id ? c : {
  ...c, id: generateConnectionId(),
});

const setConnections = (newConnections: Connection[]) => {
  connections.value = ensureConnectionHaveIds(newConnections);
};

const setEntities = (newEntities: Entity[]) => {
  entities.value = newEntities.sort(sortByName);
};

onMounted(() => {
  renderNetwork();
  document.body.addEventListener('keyup', (e) => {
    if (e.key === 'Delete') {
      const edgesIds: IdType[] = network.getSelectedEdges();
      if (edgesIds.length > 0) {
        edgesIds.forEach(edge => {
          const connectedNodes = network.getConnectedNodes(edge);
          if (connectedNodes.length === 2) {
            connections.value = connections.value.filter(connection => !(
                (connection.from === connectedNodes[0] && connection.to === connectedNodes[1])
                || (connection.from === connectedNodes[1] && connection.to === connectedNodes[0])
            ));
          }
        });
      } else {
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
    <h1>ConnMan</h1>

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
        <option v-for="p in entities" :disabled="p.id === fromId" :key="p.id" :value="p.id">
          {{ p.name }}
        </option>
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
