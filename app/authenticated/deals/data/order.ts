export interface Order {
    id: number;
    item_type_id: string;
    location_id: number;
    item_group_type_id: string;
    enchantment_level: number;
    quality_level: number;
    unit_price_silver: number;
    amount: number;
    created_at: string;
    tier?: number;
    action_type: 'request' | 'offer';
}