export type EventName = 'page_view' | 'add_to_cart' | 'begin_checkout' | 'purchase';
export type Variant = 'A' | 'B';
export type Device = 'mobile' | 'desktop' | 'tablet';
export type Channel = 'organic' | 'paid_search' | 'social' | 'email' | 'direct';

export type Event = {
  event_id: string;
  timestamp: string; // ISO 8601
  session_id: string;
  user_id: string;
  event_name: EventName;
  variant: Variant;
  device: Device;
  channel: Channel;
  experiment_id: string;
  experiment_name: string;
  value?: number; // Revenue in cents, only for purchase events
};

export type FunnelStep = {
  step_name: string;
  sessions: number;
  pct_from_previous: number;
  pct_from_start: number;
};

export type ABTestResult = {
  variant: string;
  sessions: number;
  conversions: number;
  conversion_rate: number;
  revenue: number;
  revenue_per_session: number;
};
