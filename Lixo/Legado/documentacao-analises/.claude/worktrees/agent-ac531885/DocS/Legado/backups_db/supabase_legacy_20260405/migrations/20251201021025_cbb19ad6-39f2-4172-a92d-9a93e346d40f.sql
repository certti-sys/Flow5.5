-- Create notifications table
CREATE TABLE public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT DEFAULT 'info' CHECK (type IN ('info', 'warning', 'success', 'error')),
    link TEXT,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create notification_reads table (tracks which users read which notifications)
CREATE TABLE public.notification_reads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    notification_id UUID REFERENCES public.notifications(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    read_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(notification_id, user_id)
);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_reads ENABLE ROW LEVEL SECURITY;

-- RLS Policies for notifications
CREATE POLICY "Anyone authenticated can view notifications" 
ON public.notifications
FOR SELECT 
TO authenticated
USING (true);

CREATE POLICY "Admins can create notifications" 
ON public.notifications
FOR INSERT 
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update notifications" 
ON public.notifications
FOR UPDATE 
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete notifications" 
ON public.notifications
FOR DELETE 
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for notification_reads
CREATE POLICY "Users can view own reads" 
ON public.notification_reads
FOR SELECT 
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own reads" 
ON public.notification_reads
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Indexes for performance
CREATE INDEX idx_notifications_created_at ON public.notifications(created_at DESC);
CREATE INDEX idx_notification_reads_user_id ON public.notification_reads(user_id);
CREATE INDEX idx_notification_reads_notification_id ON public.notification_reads(notification_id);