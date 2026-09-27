"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.publicUser = publicUser;
function publicUser(user) {
    const { auth_user_id: _authUserId, ...profile } = user;
    return profile;
}
