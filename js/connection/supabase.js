/**
 * Supabase Client Configuration
 * 
 * Để sử dụng, bạn cần:
 * 1. Tạo project trên https://supabase.com
 * 2. Lấy SUPABASE_URL và SUPABASE_ANON_KEY từ Settings > API
 * 3. Thêm vào index.html trong thẻ <body>:
 *    <script>
 *      window.SUPABASE_URL = 'https://your-project.supabase.co';
 *      window.SUPABASE_ANON_KEY = 'your-anon-key';
 *    </script>
 */

export const supabase = (() => {
    let client = null;
    let realtimeChannel = null;

    /**
     * Khởi tạo Supabase client
     * @returns {object|null}
     */
    const init = () => {
        if (!window.SUPABASE_URL || !window.SUPABASE_ANON_KEY) {
            console.warn('Supabase URL hoặc ANON KEY chưa được cấu hình');
            return null;
        }

        // Sử dụng Supabase từ CDN
        if (typeof window.supabase === 'undefined') {
            console.error('Supabase client chưa được load. Vui lòng thêm script tag vào HTML.');
            return null;
        }

        if (!client) {
            client = window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);
        }

        return client;
    };

    /**
     * Lấy Supabase client
     * @returns {object}
     */
    const getClient = () => {
        if (!client) {
            init();
        }
        return client;
    };

    /**
     * Subscribe real-time cho comments
     * @param {function} callback 
     * @returns {function} unsubscribe function
     */
    const subscribeComments = (callback) => {
        const sb = getClient();
        if (!sb) {
            return () => {};
        }

        // Ngắt kết nối cũ nếu có
        if (realtimeChannel) {
            realtimeChannel.unsubscribe();
        }

        realtimeChannel = sb
            .channel('comments')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'comments'
                },
                (payload) => {
                    callback(payload);
                }
            )
            .subscribe();

        return () => {
            if (realtimeChannel) {
                realtimeChannel.unsubscribe();
                realtimeChannel = null;
            }
        };
    };

    return {
        init,
        getClient,
        subscribeComments,
    };
})();

