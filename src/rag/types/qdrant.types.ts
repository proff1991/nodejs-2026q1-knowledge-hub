export type QdrantPointId = string;

export type QdrantPointPayload = Record<string, unknown>;

export type QdrantPoint = {
    id: QdrantPointId;
    vector: number[];
    payload: QdrantPointPayload;
};

export type QdrantMatchValue = string | number | boolean;

export type QdrantMatch = {
    value?: QdrantMatchValue;
    any?: QdrantMatchValue[];
};

export type QdrantCondition = {
    key: string;
    match: QdrantMatch;
};

export type QdrantFilter = {
    must?: QdrantCondition[];
    should?: QdrantCondition[];
    must_not?: QdrantCondition[];
};

export type QdrantSearchResultItem = {
    id: QdrantPointId;
    score: number;
    payload?: QdrantPointPayload;
};

export type QdrantSearchResponse = {
    result?: QdrantSearchResultItem[];
};

export type QdrantStoredPoint = {
    id: QdrantPointId;
    payload?: QdrantPointPayload;
};

export type QdrantScrollOffset = string | number | null;

export type QdrantScrollResponse = {
    result?: {
        points?: QdrantStoredPoint[];
        next_page_offset?: QdrantScrollOffset;
    };
};

export type QdrantCountResponse = {
    result?: {
        count?: number;
    };
};
