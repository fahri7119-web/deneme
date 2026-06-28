import dotenv from 'dotenv';
dotenv.config();

export const config = {
    url: process.env.SUPABASE_URL || 'https://tmtdpykzmdvxszxwyege.supabase.co',
    key: process.env.SUPABASE_ANON_KEY || 'sb_publishable_3S4Qryj5TCI4IDASoxisVw_Y9eoso2F',
    site: process.env.SITE || 'https://www.kirikkalecolyak.org.tr'
};
