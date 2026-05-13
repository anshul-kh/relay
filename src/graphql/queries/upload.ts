export const GET_UPLOAD_BY_REF_QUERY = `
    query getUploadByRef($ref: String!, $userId: uuid!) {
        uploads(where: {ref: {_eq: $ref}, user_id: {_eq: $userId}}, limit: 1) {
            id
            ref
            type
            status
            message
            file_path
            user_id
        }
    }
`;

export const CREATE_UPLOAD_MUTATION = `
    mutation createUpload($object: uploads_insert_input!) {
        upload: insert_uploads_one(object: $object) {
            id
            ref
            type
            status
            message
            file_path
            user_id
        }
    }
`;

export const UPDATE_UPLOAD_MUTATION = `
    mutation updateUpload($id: uuid!, $set: uploads_set_input!) {
        upload: update_uploads_by_pk(pk_columns: {id: $id}, _set: $set) {
            id
            ref
            type
            status
            message
            file_path
            user_id
        }
    }
`;
