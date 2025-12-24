import { gif } from "./gif.js";
import { card } from "./card.js";
import { like } from "./like.js";
import { util } from "../../common/util.js";
import { pagination } from "./pagination.js";
import { dto } from "../../connection/dto.js";
import { lang } from "../../common/language.js";
import { storage } from "../../common/storage.js";
import { session } from "../../common/session.js";
import { supabase } from "../../connection/supabase.js";

export const comment = (() => {
    /**
     * @type {ReturnType<typeof storage>|null}
     */
    let owns = null;

    /**
     * @type {ReturnType<typeof storage>|null}
     */
    let showHide = null;

    /**
     * @type {HTMLElement|null}
     */
    let comments = null;

    /**
     * @type {string[]}
     */
    const lastRender = [];

    /**
     * @type {function|null}
     */
    let unsubscribeRealtime = null;

    /**
     * Cleanup function để unsubscribe real-time khi cần
     * @returns {void}
     */
    const cleanup = () => {
        if (unsubscribeRealtime) {
            unsubscribeRealtime();
            unsubscribeRealtime = null;
        }
    };

    /**
     * @returns {string}
     */
    const onNullComment = () => {
        const desc = lang
            .on(
                "id",
                "📢 Yuk, share undangan ini biar makin rame komentarnya! 🎉"
            )
            .on("en", "📢 Let's share this invitation to get more comments! 🎉")
            .get();

        return `<div class="text-center p-4 mx-0 mt-0 mb-3 bg-theme-auto rounded-4 shadow"><p class="fw-bold p-0 m-0" style="font-size: 0.95rem;">${desc}</p></div>`;
    };

    /**
     * @param {string} id
     * @param {boolean} disabled
     * @returns {void}
     */
    const changeActionButton = (id, disabled) => {
        document
            .querySelector(`[data-button-action="${id}"]`)
            .childNodes.forEach((e) => {
                e.disabled = disabled;
            });
    };

    /**
     * @param {string} id
     * @returns {void}
     */
    const removeInnerForm = (id) => {
        changeActionButton(id, false);
        document.getElementById(`inner-${id}`).remove();
    };

    /**
     * @param {HTMLButtonElement} button
     * @returns {void}
     */
    const showOrHide = (button) => {
        const ids = button.getAttribute("data-uuids").split(",");
        const isShow = button.getAttribute("data-show") === "true";
        const uuid = button.getAttribute("data-uuid");
        const currentShow = showHide.get("show");

        button.setAttribute("data-show", isShow ? "false" : "true");
        button.innerText = isShow
            ? `Show replies (${ids.length})`
            : "Hide replies";
        showHide.set(
            "show",
            isShow
                ? currentShow.filter((i) => i !== uuid)
                : [...currentShow, uuid]
        );

        for (const id of ids) {
            showHide.set(
                "hidden",
                showHide.get("hidden").map((i) => {
                    if (i.uuid === id) {
                        i.show = !isShow;
                    }

                    return i;
                })
            );

            document.getElementById(id).classList.toggle("d-none", isShow);
        }
    };

    /**
     * @param {HTMLAnchorElement} anchor
     * @param {string} uuid
     * @returns {void}
     */
    const showMore = (anchor, uuid) => {
        const content = document.getElementById(`content-${uuid}`);
        const original = util.base64Decode(
            content.getAttribute("data-comment")
        );
        const isCollapsed = anchor.getAttribute("data-show") === "false";

        util.safeInnerHTML(
            content,
            util.convertMarkdownToHTML(
                util.escapeHtml(
                    isCollapsed
                        ? original
                        : original.slice(0, card.maxCommentLength) + "..."
                )
            )
        );
        anchor.innerText = isCollapsed ? "Sebagian" : "Selengkapnya";
        anchor.setAttribute("data-show", isCollapsed ? "true" : "false");
    };

    /**
     * @param {ReturnType<typeof dto.getCommentResponse>} c
     * @returns {Promise<void>}
     */
    const fetchTracker = async (c) => {
        if (c.comments) {
            await Promise.all(c.comments.map((v) => fetchTracker(v)));
        }

        if (!c.ip || !c.user_agent || c.is_admin) {
            return;
        }

        /**
         * @param {string} result
         * @returns {void}
         */
        const setResult = (result) => {
            const commentIp = document.getElementById(
                `ip-${util.escapeHtml(c.uuid)}`
            );
            util.safeInnerHTML(
                commentIp,
                `<i class="fa-solid fa-location-dot me-1"></i>${util.escapeHtml(
                    c.ip
                )} <strong>${util.escapeHtml(result)}</strong>`
            );
        };

        // Free for commercial and non-commercial use.
        try {
            const res = await fetch(`https://apip.cc/api-json/${c.ip}`);
            const data = await res.json();
            let result = "localhost";

            if (data.status === "success") {
                if (
                    data.City &&
                    data.City.length !== 0 &&
                    data.RegionName &&
                    data.RegionName.length !== 0
                ) {
                    result = data.City + " - " + data.RegionName;
                } else if (
                    data.Capital &&
                    data.Capital.length !== 0 &&
                    data.CountryName &&
                    data.CountryName.length !== 0
                ) {
                    result = data.Capital + " - " + data.CountryName;
                }
            }

            setResult(result);
        } catch (err) {
            setResult(err.message);
        }
    };

    /**
     * @param {ReturnType<typeof dto.getCommentsResponse>} items
     * @param {ReturnType<typeof dto.commentShowMore>[]} hide
     * @returns {ReturnType<typeof dto.commentShowMore>[]}
     */
    const traverse = (items, hide = []) => {
        const dataShow = showHide.get("show");

        const buildHide = (lists) =>
            lists.forEach((item) => {
                if (hide.find((i) => i.uuid === item.uuid)) {
                    buildHide(item.comments);
                    return;
                }

                hide.push(dto.commentShowMore(item.uuid));
                buildHide(item.comments);
            });

        const setVisible = (lists) =>
            lists.forEach((item) => {
                if (!dataShow.includes(item.uuid)) {
                    setVisible(item.comments);
                    return;
                }

                item.comments.forEach((c) => {
                    const i = hide.findIndex((h) => h.uuid === c.uuid);
                    if (i !== -1) {
                        hide[i].show = true;
                    }
                });

                setVisible(item.comments);
            });

        buildHide(items);
        setVisible(items);

        return hide;
    };

    /**
     * Chuyển đổi dữ liệu từ Supabase sang format của dto
     * @param {any} data
     * @param {any[]} allComments
     * @returns {ReturnType<typeof dto.getCommentResponse>}
     */
    const transformSupabaseComment = (data, allComments = []) => {
        // Tìm các comment con (replies)
        const childComments = allComments
            .filter((c) => c.parent_id === data.id)
            .map((c) => transformSupabaseComment(c, allComments));

        return dto.getCommentResponse({
            uuid: data.id,
            own: data.id, // Supabase sẽ tự động tạo ID
            name: data.name,
            presence: data.presence ?? false,
            comment: data.comment,
            created_at: data.created_at,
            is_admin: data.is_admin ?? false,
            is_parent: !data.parent_id,
            gif_url: data.gif_url,
            ip: data.ip,
            user_agent: data.user_agent,
            comments: childComments,
            like_count: data.like_count ?? 0,
        });
    };

    /**
     * @returns {Promise<ReturnType<typeof dto.getCommentsResponse>>}
     */
    const show = async () => {
        const sb = supabase.getClient();
        if (!sb) {
            comments.setAttribute("data-loading", "false");
            comments.innerHTML = onNullComment();
            return { data: { count: 0, lists: [] } };
        }

        // remove all event listener.
        lastRender.forEach((u) => {
            like.removeListener(u);
        });

        if (comments.getAttribute("data-loading") === "false") {
            comments.setAttribute("data-loading", "true");
            comments.innerHTML = card
                .renderLoading()
                .repeat(pagination.getPer());
        }

        try {
            // Lấy tất cả comments (chỉ parent comments)
            const per = pagination.getPer();
            const offset = pagination.getNext() * per;

            const {
                data: commentsData,
                error,
                count,
            } = await sb
                .from("comments")
                .select("*", { count: "exact" })
                .is("parent_id", null)
                .order("created_at", { ascending: false })
                .range(offset, offset + per - 1);

            if (error) {
                throw error;
            }

            // Lấy tất cả comments để build tree structure
            const { data: allComments } = await sb
                .from("comments")
                .select("*")
                .order("created_at", { ascending: true });

            comments.setAttribute("data-loading", "false");

            for (const u of lastRender) {
                await gif.remove(u);
            }

            if (!commentsData || commentsData.length === 0) {
                comments.innerHTML = onNullComment();
                return { data: { count: count ?? 0, lists: [] } };
            }

            // Transform và build tree structure
            const transformedLists = commentsData.map((c) =>
                transformSupabaseComment(c, allComments ?? [])
            );

            const flatten = (ii) =>
                ii.flatMap((i) => [i.uuid, ...flatten(i.comments)]);
            lastRender.splice(
                0,
                lastRender.length,
                ...flatten(transformedLists)
            );
            showHide.set(
                "hidden",
                traverse(transformedLists, showHide.get("hidden"))
            );

            let data = await card.renderContentMany(transformedLists);
            if (transformedLists.length < per) {
                data += onNullComment();
            }

            util.safeInnerHTML(comments, data);

            lastRender.forEach((u) => {
                like.addListener(u);
            });

            comments.dispatchEvent(new Event("undangan.comment.result"));

            if (transformedLists && session.isAdmin()) {
                await Promise.all(transformedLists.map((v) => fetchTracker(v)));
            }

            pagination.setTotal(count ?? 0);
            comments.dispatchEvent(new Event("undangan.comment.done"));

            return { data: { count: count ?? 0, lists: transformedLists } };
        } catch (error) {
            console.error("Error fetching comments:", error);
            comments.setAttribute("data-loading", "false");
            comments.innerHTML = `<div class="text-center p-4 mx-0 mt-0 mb-3 bg-theme-auto rounded-4 shadow"><p class="fw-bold p-0 m-0 text-danger" style="font-size: 0.95rem;">Lỗi khi tải bình luận: ${error.message}</p></div>`;
            return { data: { count: 0, lists: [] } };
        }
    };

    /**
     * @param {HTMLButtonElement} button
     * @returns {Promise<void>}
     */
    const remove = async (button) => {
        if (!util.ask("Are you sure?")) {
            return;
        }

        const id = button.getAttribute("data-uuid");

        if (session.isAdmin()) {
            owns.set(id, button.getAttribute("data-own"));
        }

        changeActionButton(id, true);
        const btn = util.disableButton(button);
        const likes = like.getButtonLike(id);
        likes.disabled = true;

        const sb = supabase.getClient();
        if (!sb) {
            btn.restore();
            likes.disabled = false;
            changeActionButton(id, false);
            util.notify("Supabase client chưa được khởi tạo").error();
            return;
        }

        const { error } = await sb
            .from("comments")
            .delete()
            .eq("id", owns.get(id));

        if (error) {
            console.error("Error deleting comment:", error);
            btn.restore();
            likes.disabled = false;
            changeActionButton(id, false);
            util.notify("Không thể xóa bình luận").error();
            return;
        }

        document
            .querySelectorAll('a[onclick="undangan.comment.showOrHide(this)"]')
            .forEach((n) => {
                const oldUuids = n.getAttribute("data-uuids").split(",");

                if (oldUuids.includes(id)) {
                    const uuids = oldUuids.filter((i) => i !== id).join(",");
                    uuids.length === 0
                        ? n.remove()
                        : n.setAttribute("data-uuids", uuids);
                }
            });

        owns.unset(id);
        document.getElementById(id).remove();

        if (comments.children.length === 0) {
            comments.innerHTML = onNullComment();
        }
    };

    /**
     * @param {HTMLButtonElement} button
     * @returns {Promise<void>}
     */
    const update = async (button) => {
        const id = button.getAttribute("data-uuid");

        let isPresent = false;
        const presence = document.getElementById(`form-inner-presence-${id}`);
        if (presence) {
            presence.disabled = true;
            isPresent = presence.value === "1";
        }

        const badge = document.getElementById(`badge-${id}`);
        const isChecklist =
            !!badge && badge.getAttribute("data-is-presence") === "true";

        const gifIsOpen = gif.isOpen(id);
        const gifId = gif.getResultId(id);
        const gifCancel = gif.buttonCancel(id);

        if (gifIsOpen && gifId) {
            gifCancel.hide();
        }

        const form = document.getElementById(`form-inner-${id}`);

        if (
            id &&
            !gifIsOpen &&
            util.base64Encode(form.value) ===
                form.getAttribute("data-original") &&
            isChecklist === isPresent
        ) {
            removeInnerForm(id);
            return;
        }

        if (!gifIsOpen && form.value?.trim().length === 0) {
            util.notify("Comments cannot be empty.").warning();
            return;
        }

        if (form) {
            form.disabled = true;
        }

        const cancel = document.querySelector(
            `[onclick="undangan.comment.cancel(this, '${id}')"]`
        );
        if (cancel) {
            cancel.disabled = true;
        }

        const btn = util.disableButton(button);

        const sb = supabase.getClient();
        if (!sb) {
            if (form) {
                form.disabled = false;
            }
            if (cancel) {
                cancel.disabled = false;
            }
            if (presence) {
                presence.disabled = false;
            }
            btn.restore();
            if (gifIsOpen && gifId) {
                gifCancel.show();
            }
            util.notify("Supabase client chưa được khởi tạo").error();
            return;
        }

        const updateData = {};
        if (presence !== null) {
            updateData.presence = isPresent;
        }
        if (!gifIsOpen && form.value) {
            updateData.comment = form.value;
        }
        if (gifId) {
            updateData.gif_url = gifId; // Giả sử gif_id được lưu trong gif_url
        }

        const { error } = await sb
            .from("comments")
            .update(updateData)
            .eq("id", owns.get(id));

        if (form) {
            form.disabled = false;
        }

        if (cancel) {
            cancel.disabled = false;
        }

        if (presence) {
            presence.disabled = false;
        }

        btn.restore();

        if (gifIsOpen && gifId) {
            gifCancel.show();
        }

        if (error) {
            console.error("Error updating comment:", error);
            util.notify("Không thể cập nhật bình luận").error();
            return;
        }

        if (gifIsOpen && gifId) {
            document.getElementById(`img-gif-${id}`).src = document
                .getElementById(`gif-result-${id}`)
                ?.querySelector("img").src;
            gifCancel.click();
        }

        removeInnerForm(id);

        if (!gifIsOpen) {
            const showButton = document.querySelector(
                `[onclick="undangan.comment.showMore(this, '${id}')"]`
            );

            const content = document.getElementById(`content-${id}`);
            content.setAttribute("data-comment", util.base64Encode(form.value));

            const original = util.convertMarkdownToHTML(
                util.escapeHtml(form.value)
            );
            if (form.value.length > card.maxCommentLength) {
                util.safeInnerHTML(
                    content,
                    showButton?.getAttribute("data-show") === "false"
                        ? original.slice(0, card.maxCommentLength) + "..."
                        : original
                );
                showButton?.classList.replace("d-none", "d-block");
            } else {
                util.safeInnerHTML(content, original);
                showButton?.classList.replace("d-block", "d-none");
            }
        }

        if (presence) {
            document.getElementById("form-presence").value = isPresent
                ? "1"
                : "2";
            storage("information").set("presence", isPresent);
        }

        if (!presence || !badge) {
            return;
        }

        badge.classList.toggle("fa-circle-xmark", !isPresent);
        badge.classList.toggle("text-danger", !isPresent);

        badge.classList.toggle("fa-circle-check", isPresent);
        badge.classList.toggle("text-success", isPresent);
    };

    /**
     * @param {HTMLButtonElement} button
     * @returns {Promise<void>}
     */
    const send = async (button) => {
        const id = button.getAttribute("data-uuid");

        const name = document.getElementById("form-name");
        const nameValue = name.value;

        if (nameValue.length === 0) {
            util.notify("Name cannot be empty.").warning();

            if (id) {
                // scroll to form.
                name.scrollIntoView({ block: "center" });
            }
            return;
        }

        const presence = document.getElementById("form-presence");
        if (!id && presence && presence.value === "0") {
            util.notify("Please select your attendance status.").warning();
            return;
        }

        const gifIsOpen = gif.isOpen(id ? id : gif.default);
        const gifId = gif.getResultId(id ? id : gif.default);
        const gifCancel = gif.buttonCancel(id);

        if (gifIsOpen && !gifId) {
            util.notify("Gif cannot be empty.").warning();
            return;
        }

        if (gifIsOpen && gifId) {
            gifCancel.hide();
        }

        const form = document.getElementById(
            `form-${id ? `inner-${id}` : "comment"}`
        );
        if (!gifIsOpen && form.value?.trim().length === 0) {
            util.notify("Comments cannot be empty.").warning();
            return;
        }

        if (!id && name && !session.isAdmin()) {
            name.disabled = true;
        }

        if (!session.isAdmin() && presence && presence.value !== "0") {
            presence.disabled = true;
        }

        if (form) {
            form.disabled = true;
        }

        const cancel = document.querySelector(
            `[onclick="undangan.comment.cancel(this, '${id}')"]`
        );
        if (cancel) {
            cancel.disabled = true;
        }

        const btn = util.disableButton(button);
        const isPresence = presence ? presence.value === "1" : true;

        if (!session.isAdmin()) {
            const info = storage("information");
            info.set("name", nameValue);

            if (!id) {
                info.set("presence", isPresence);
            }
        }

        const sb = supabase.getClient();
        if (!sb) {
            if (name) {
                name.disabled = false;
            }
            if (form) {
                form.disabled = false;
            }
            if (cancel) {
                cancel.disabled = false;
            }
            if (presence) {
                presence.disabled = false;
            }
            if (gifIsOpen && gifId) {
                gifCancel.show();
            }
            btn.restore();
            util.notify("Supabase client chưa được khởi tạo").error();
            return;
        }

        const insertData = {
            name: nameValue,
            presence: isPresence,
            comment: gifIsOpen ? null : form.value,
            gif_url: gifId || null,
            parent_id: id || null,
        };

        const { data: newComment, error } = await sb
            .from("comments")
            .insert(insertData)
            .select()
            .single();

        if (name) {
            name.disabled = false;
        }

        if (form) {
            form.disabled = false;
        }

        if (cancel) {
            cancel.disabled = false;
        }

        if (presence) {
            presence.disabled = false;
        }

        if (gifIsOpen && gifId) {
            gifCancel.show();
        }

        btn.restore();

        if (error || !newComment) {
            console.error("Error creating comment:", error);
            util.notify("Không thể gửi bình luận").error();
            return;
        }

        const response = {
            data: transformSupabaseComment(newComment, []),
            code: 201,
        };

        owns.set(response.data.uuid, response.data.own);

        if (form) {
            form.value = null;
        }

        if (gifIsOpen && gifId) {
            gifCancel.click();
        }

        if (!id) {
            if (pagination.reset()) {
                await show();
                comments.scrollIntoView();
                return;
            }

            pagination.setTotal(pagination.geTotal() + 1);
            if (comments.children.length === pagination.getPer()) {
                comments.lastElementChild.remove();
            }

            response.data.is_parent = true;
            response.data.is_admin = session.isAdmin();
            comments.insertAdjacentHTML(
                "afterbegin",
                await card.renderContentMany([response.data])
            );
            comments.scrollIntoView();
        }

        if (id) {
            showHide.set(
                "hidden",
                showHide
                    .get("hidden")
                    .concat([dto.commentShowMore(response.data.uuid, true)])
            );
            showHide.set("show", showHide.get("show").concat([id]));

            removeInnerForm(id);

            response.data.is_parent = false;
            response.data.is_admin = session.isAdmin();
            document
                .getElementById(`reply-content-${id}`)
                .insertAdjacentHTML(
                    "beforeend",
                    await card.renderContentSingle(response.data)
                );

            const anchorTag = document
                .getElementById(`button-${id}`)
                .querySelector("a");
            if (anchorTag) {
                if (anchorTag.getAttribute("data-show") === "false") {
                    showOrHide(anchorTag);
                }

                anchorTag.remove();
            }

            const uuids = [response.data.uuid];
            const readMoreElement = document
                .createRange()
                .createContextualFragment(
                    card.renderReadMore(
                        id,
                        anchorTag
                            ? anchorTag
                                  .getAttribute("data-uuids")
                                  .split(",")
                                  .concat(uuids)
                            : uuids
                    )
                );

            const buttonLike = like.getButtonLike(id);
            buttonLike.parentNode.insertBefore(readMoreElement, buttonLike);
        }

        like.addListener(response.data.uuid);
        lastRender.push(response.data.uuid);
    };

    /**
     * @param {HTMLButtonElement} button
     * @param {string} id
     * @returns {Promise<void>}
     */
    const cancel = async (button, id) => {
        const presence = document.getElementById(`form-inner-presence-${id}`);
        const isPresent = presence ? presence.value === "1" : false;

        const badge = document.getElementById(`badge-${id}`);
        const isChecklist =
            badge && owns.has(id) && presence
                ? badge.getAttribute("data-is-presence") === "true"
                : false;

        const btn = util.disableButton(button);

        if (
            gif.isOpen(id) &&
            ((!gif.getResultId(id) && isChecklist === isPresent) ||
                util.ask("Are you sure?"))
        ) {
            await gif.remove(id);
            removeInnerForm(id);
            return;
        }

        const form = document.getElementById(`form-inner-${id}`);
        if (
            form.value.length === 0 ||
            (util.base64Encode(form.value) ===
                form.getAttribute("data-original") &&
                isChecklist === isPresent) ||
            util.ask("Are you sure?")
        ) {
            removeInnerForm(id);
            return;
        }

        btn.restore();
    };

    /**
     * @param {string} uuid
     * @returns {void}
     */
    const reply = (uuid) => {
        changeActionButton(uuid, true);

        gif.remove(uuid).then(() => {
            gif.onOpen(uuid, () => gif.removeGifSearch(uuid));
            document
                .getElementById(`button-${uuid}`)
                .insertAdjacentElement("afterend", card.renderReply(uuid));
        });
    };

    /**
     * @param {HTMLButtonElement} button
     * @param {boolean} is_parent
     * @returns {Promise<void>}
     */
    const edit = async (button, is_parent) => {
        const id = button.getAttribute("data-uuid");

        changeActionButton(id, true);

        if (session.isAdmin()) {
            owns.set(id, button.getAttribute("data-own"));
        }

        const badge = document.getElementById(`badge-${id}`);
        const isChecklist =
            !!badge && badge.getAttribute("data-is-presence") === "true";

        const gifImage = document.getElementById(`img-gif-${id}`);
        if (gifImage) {
            await gif.remove(id);
        }

        const isParent = is_parent && !session.isAdmin();
        document
            .getElementById(`button-${id}`)
            .insertAdjacentElement(
                "afterend",
                card.renderEdit(id, isChecklist, isParent, !!gifImage)
            );

        if (gifImage) {
            gif.onOpen(id, () => {
                gif.removeGifSearch(id);
                gif.removeButtonBack(id);
            });

            await gif.open(id);
            return;
        }

        const formInner = document.getElementById(`form-inner-${id}`);
        const original = util.base64Decode(
            document
                .getElementById(`content-${id}`)
                ?.getAttribute("data-comment")
        );

        formInner.value = original;
        formInner.setAttribute("data-original", util.base64Encode(original));
    };

    /**
     * @returns {void}
     */
    const init = () => {
        gif.init();
        like.init();
        card.init();
        pagination.init();

        comments = document.getElementById("comments");
        comments.addEventListener("undangan.comment.show", show);

        owns = storage("owns");
        showHide = storage("comment");

        if (!showHide.has("hidden")) {
            showHide.set("hidden", []);
        }

        if (!showHide.has("show")) {
            showHide.set("show", []);
        }

        // Khởi tạo Supabase
        supabase.init();

        // Subscribe real-time updates
        unsubscribeRealtime = supabase.subscribeComments((payload) => {
            if (
                payload.eventType === "INSERT" ||
                payload.eventType === "UPDATE" ||
                payload.eventType === "DELETE"
            ) {
                // Reload comments khi có thay đổi
                show();
            }
        });
    };

    return {
        gif,
        like,
        pagination,
        init,
        send,
        edit,
        reply,
        remove,
        update,
        cancel,
        show,
        showMore,
        showOrHide,
        cleanup,
    };
})();
