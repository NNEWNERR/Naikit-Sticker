export interface Comment {
    id: string;
    user: string;
    text: string;
    date: Date;
    likes: number;
    worksheet_id: string;
    is_deleted: boolean;
    deleted_at: Date | null;    
    replies: Reply[];
}

export interface Reply {
    id: string;
    user: string;
    text: string;
    date: Date;
    likes: number;
}