export interface Entity {
	id: string;
	name: string;
	type: EntityType;
}

export enum EntityType {
	PERSON = 'person',
	GROUP = 'group',
}

export enum ConnectionType {
	ONE_WAY = 'one-way',
	BI_DIRECTIONAL = 'bi-directional',
}

export interface Connection {
	from: string;
	to: string;
	type: ConnectionType;
}
