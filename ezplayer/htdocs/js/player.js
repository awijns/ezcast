/*
 * EZCAST EZplayer
 *
 * Copyright (C) 2014 Université libre de Bruxelles
 *
 * Written by Michel Jansens <mjansens@ulb.ac.be>
 * 	      Arnaud Wijns <awijns@ulb.ac.be>
 *            Carlos Avidmadjessi
 * UI Design by Julien Di Pietrantonio
 *
 * This software is free software; you can redistribute it and/or
 * modify it under the terms of the GNU Lesser General Public
 * License as published by the Free Software Foundation; either
 * version 3 of the License, or (at your option) any later version.
 *
 * This software is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
 * Lesser General Public License for more details.
 *
 * You should have received a copy of the GNU Lesser General Public
 * License along with this software; if not, write to the Free Software
 * Foundation, Inc., 59 Temple Place, Suite 330, Boston, MA  02111-1307  USA
 */

var quality;
var type;
var cam_loaded;
var slide_loaded;
var panel_width = 231;
var save_currentTime = null;
var from_shortcut = false;
var trace_pause = false;
/**
 * Duration of the notification (sec)
 * @type Number
 */
var notif_display_delay = 10;
/**
 * Number of threads to display at once
 * @type Number
 */
var notif_display_number = 3;

window.addEventListener("keyup", function (e) {
    var el = document.activeElement;

    if (lvl == 3 && (!el || (el.tagName.toLowerCase() != 'input' &&
            el.tagName.toLowerCase() != 'textarea'))) {
        from_shortcut = true;
        // focused element is not an input or textarea
        switch (e.keyCode) {
            case 32:  // space 
                toggle_play();
                break;
            case 66:  // 'b'
                toggle_panel();
                break;
            case 68:  // 'd'
                if (is_logged)
                    toggle_thread_form();
                break;
            case 78:  // 'n'
                if (is_logged)
                    toggle_bookmark_form('custom');
                break;
            case 107:
            case 187: // '+'
                video_playbackspeed('up');
                break;
            case 109:
            case 189: // '-'
                video_playbackspeed('down');
                break;
            case 82: // 'r'
                toggle_shortcuts();
                break;
            case 83:  // 's'
                (type == 'cam') ?
                        switch_video('slide') :
                        switch_video('cam');
                break;
            case 37:  // 'left arrow'
                video_navigate('rewind');
                break;
            case 39:  // 'right arrow'
                video_navigate('forward');
                break;
            case 27:  // 'esc'
                video_fullscreen(false);
                break;
            case 70:  // 'f'
                video_fullscreen(!fullscreen);
                break;
            case 38:  // 'up arrow'
                video_volume('up');
                break;
            case 40:  // 'down arrow'
                video_volume('down');
                break;
            case 77:  // 'm'
                toggle_mute();
                break;
            case 79 : // 'o'
                if (is_lecturer == true)
                    toggle_bookmark_form('official');
                break;
            case 76:  // 'l'
                video_link();
                break;
            case 8:  // 'backspace'
                break;
        }
    } else if (lvl == 3) {
        if (e.keyCode == 27) {
            // leave focus when esc is pressed in input or text field
            $('input, textarea').blur();
        }
    }
}, false);

window.addEventListener("keydown", function (e) {
    var el = document.activeElement;

    if (lvl == 3 && (!el || (el.tagName.toLowerCase() != 'input' &&
            el.tagName.toLowerCase() != 'textarea'))) {
        // space and arrow keys
        if ([32, 37, 38, 39, 40, 8].indexOf(e.keyCode) > -1) {
            e.preventDefault();
        }
    }
}, false);

// resizes the video when video is played fullscreen 
$(window).bind('resize', function (e)
{
    window.resizeEvt;
    $(window).resize(function ()
    {
        // wait for the window being resized
        clearTimeout(window.resizeEvt);
        window.resizeEvt = setTimeout(function ()
        {

            if (fullscreen) {
                video_resize();
                if (show_panel) {
                    panel_resize();
                    $('video').css('width', $(window).width() - panel_width + 'px');
                }

            }
        }, 250);
    });
});

function load_player(media) {
    // Notification panel starts hidden
    $('#video_notifications').hide();
    var videos = document.getElementsByTagName('video');
    for (var i = 0, max = videos.length; i < max; i++) {
        videos[i].addEventListener("seeked", function () {
            previous_time = time;
            time = Math.round(this.currentTime);
            document.getElementById('bookmark_timecode').value = time;
            document.getElementById('thread_timecode').value = Math.round(this.currentTime);
            server_trace(new Array('4', 'video_seeked', current_album, current_asset, duration, previous_time, time, type, quality));
        }, false);

        // Listener on video time change
        // In order to match threads timecode to video timecode
        videos[i].addEventListener("timeupdate", function () {
            currentTime = Math.round(this.currentTime);

            if (currentTime == save_currentTime)
                return;

            save_currentTime = currentTime;

            if (!display_threads_notif)
                return;
            html_value = "<ul>";
            var i = 0;
            var timecode = currentTime - notif_display_delay;
            while (i < notif_display_number && timecode <= currentTime) {
                if (timecode >= 0 && typeof threads_array[timecode] !== 'undefined') {
                    for (var id in threads_array[timecode]) {

                        i++;
                        if (i > notif_display_number)
                            break;
                        html_value += "<li id='notif_" + id + "' class ='notification_item'>" +
                                "<span class='span-link red' onclick='javascript:remove_notification_item(" + timecode + ", " + id + ")' >x</span>" +
                                "<span class='notification-item-title' onclick='javascript:thread_details_update(" + id + ", true)'> " +
                                threads_array[timecode][id] + "</span>" +
                                "</li>";
                    }
                }
                timecode++;
            }

            html_value += "</ul>";
            $('#notifications').html(html_value);
            if (i > 0)
                $('#video_notifications').slideDown();
            else
                $('#video_notifications').slideUp();
        });

    }

    var elem = media.split('_');
    quality = elem[0];
    type = elem[1];

}

function video_addlisterners() {

}

function switch_video(media_type) {
    /*    
     if (media_type != "cam" && media_type != "slide") return;
     if (media_type == type) return;
     if (quality != 'high' && quality != 'low') quality = 'low';
     var media = quality + '_' + media_type;
     var video = document.getElementById('main_video');
     var source = document.getElementById('main_video_source');
     var paused = video.paused;
     var oldCurrentTime = video.currentTime;
     // doesn't work in Safari 5
     // source.setAttribute('src', source.getAttribute(media + '_src'));  
     video.setAttribute('src', source.getAttribute(media + '_src'));
     video.load();  
     video.addEventListener('loadedmetadata', function() {        
     this.currentTime = oldCurrentTime;
     }, false); 
     paused ? video.pause() : video.play();
     var elem = media.split('_');
     quality = elem[0];
     type = elem[1];
     $('.movie-button, .slide-button').toggleClass('active');
     */
    origin = get_origin();

    if (media_type != "cam" && media_type != "slide")
        return;
    if (media_type == type)
        return;
    if (quality != 'high' && quality != 'low')
        quality = 'low';
    var media = quality + '_' + media_type;
    if (media_type == 'cam') {
        var to_show = document.getElementById('main_video');
        var to_hide = document.getElementById('secondary_video');
    } else {
        var to_hide = document.getElementById('main_video');
        var to_show = document.getElementById('secondary_video');
    }
    var oldCurrentTime = to_hide.currentTime;

    if (/webOS|iPhone|iPad|iPod|BlackBerry/i.test(navigator.userAgent)) {
        trace_pause = true; // disables trace to make sure play/pause actions are not written in the logs
        to_hide.pause();
        if ((media_type == 'cam' && cam_loaded) || (media_type == 'slide' && slide_loaded)) {
            to_show.currentTime = oldCurrentTime;
            trace_pause = true; // disables trace to make sure play/pause actions are not written in the logs
            to_show.play();
            document.getElementById("load_warn").style.display = 'none';
        } else {
            document.getElementById("load_warn").style.display = 'block';
        }
    } else if (/Android/i.test(navigator.userAgent)) {
        trace_pause = true; // disables trace to make sure play/pause actions are not written in the logs
        to_hide.pause();
        to_show.currentTime = oldCurrentTime;
    } else {
        to_show.currentTime = oldCurrentTime;
        if (!to_hide.paused) {
            trace_pause = true; // disables trace to make sure play/pause actions are not written in the logs
            to_hide.pause();
            trace_pause = true; // disables trace to make sure play/pause actions are not written in the logs
            to_show.play();
        }
    }
    to_hide.style.display = 'none';
    to_show.style.display = 'block';
    var elem = media.split('_');
    quality = elem[0];
    from = type;
    type = elem[1];
    server_trace(new Array('4', 'video_switch', current_album, current_asset, duration, time, from, type, quality, origin));
    $('.movie-button, .slide-button').toggleClass('active');
}

function toggle_video_quality(media_quality) {

    if (media_quality != "high" && media_quality != "low")
        return;
    if (media_quality == quality)
        return;
    var media = media_quality + '_' + type;

    if (document.getElementById('secondary_video') && type == 'slide') {
        var video = document.getElementById('secondary_video');
    } else {
        var video = document.getElementById('main_video');
    }

    var source = document.getElementById('main_video_source');
    var paused = video.paused;
    var oldCurrentTime = video.currentTime;
    // doesn't work in Safari 5
    // source.setAttribute('src', source.getAttribute(media + '_src')); 

    if (document.getElementById('secondary_video')) {
        document.getElementById('main_video').setAttribute('src', source.getAttribute(media_quality + '_cam_src'));
        document.getElementById('secondary_video').setAttribute('src', source.getAttribute(media_quality + '_slide_src'));
        document.getElementById('main_video').load();
        document.getElementById('secondary_video').load();
    } else {
        video.setAttribute('src', source.getAttribute(media + '_src'));
        video.load();
    }
    video.addEventListener('loadedmetadata', function () {
        this.currentTime = oldCurrentTime;
    }, false);
    trace_pause = true;
    paused ? video.pause() : video.play();
    var elem = media.split('_');
    quality = elem[0];
    type = elem[1];
    $('.high-button, .low-button').toggleClass('active');
    server_trace(new Array('4', 'video_quality', current_album, current_asset, duration, time, type, media_quality, quality));

}

function seek_video(bookmark_time, bookmark_type) {
    server_trace(new Array('4', 'video_bookmark_click', current_album, current_asset, duration, time, bookmark_time, type, bookmark_type, current_tab, quality));

    if (bookmark_type != '' && type != bookmark_type) {
        switch_video(bookmark_type);
    }
    if (document.getElementById('secondary_video')) {
        if (type == 'slide') {

            var video = document.getElementById('secondary_video');
        } else {

            var video = document.getElementById('main_video');
        }
    } else {
        var video = document.getElementById('main_video');
    }
    var paused = video.paused;
    //  video.load();  
    //  video.addEventListener('loadedmetadata', function() {        
    //      this.currentTime = time;
    //  }, false);      
    video.currentTime = bookmark_time;
    paused ? video.pause() : video.play();
}

function video_playbackspeed(rate) {
    origin = get_origin();
    var video = document.getElementById('main_video');
    var playbackSpeed = video.playbackRate;
    if (playbackSpeed == 0.5 && rate == 'up') {
        playbackSpeed = 1;
    } else if (playbackSpeed < 2 && rate == 'up') {
        playbackSpeed = playbackSpeed + 0.2;
    } else if (playbackSpeed > 1 && rate == "down") {
        playbackSpeed = playbackSpeed - 0.2;
    } else if (playbackSpeed <= 1 && playbackSpeed > 0.5 && rate == "down") {
        playbackSpeed = playbackSpeed - 0.5;
    }
    server_trace(new Array('4', 'playback_speed_' + rate, current_album, current_asset, duration, time, type, quality, playbackSpeed, origin));

    if (document.getElementById('secondary_video')) {
        document.getElementById('secondary_video').playbackRate = playbackSpeed;
    }
    video.playbackRate = playbackSpeed;
    document.getElementById('toggleRate').innerHTML = (playbackSpeed.toFixed(1) + 'x');
}

function toggle_playbackspeed() {
    origin = get_origin();
    var video = document.getElementById('main_video');
    var playbackSpeed = video.playbackRate;
    var rate;

    if (playbackSpeed == 0.5) {
        playbackSpeed = 1;
        rate = 'up';
    } else if (playbackSpeed < 2) {
        playbackSpeed = playbackSpeed + 0.2;
        rate = 'up';
    } else {
        playbackSpeed = 0.5;
        rate = 'down';
    }
    server_trace(new Array('4', 'playback_speed_' + rate, current_album, current_asset, duration, time, type, quality, playbackSpeed, origin));

    if (document.getElementById('secondary_video')) {
        document.getElementById('secondary_video').playbackRate = playbackSpeed;
    }
    video.playbackRate = playbackSpeed;
    document.getElementById('toggleRate').innerHTML = (playbackSpeed.toFixed(1) + 'x');
    if (playbackSpeed != 1) {
        document.getElementById('toggleRate').classList.add('active');
    } else {
        document.getElementById('toggleRate').classList.remove('active');
    }
}

function show_bookmark_form(source) {
    // Hide thread form if it's visible
    if (thread_form) {
        hide_thread_form(false);
        return;
    }

    $("#video_shortcuts").css("display", "none");
    if (document.getElementById('secondary_video')) {
        if (type == 'slide') {
            var video = document.getElementById('secondary_video');
        } else {
            var video = document.getElementById('main_video');
        }
    } else {
        var video = document.getElementById('main_video');
    }

    video.pause();
    document.getElementById('bookmark_timecode').value = Math.round(video.currentTime);
    document.getElementById('bookmark_source').value = source;
    document.getElementById('bookmark_type').value = type;
    if (source == 'official') {
        $('.bookmark-color').hide();
        $('.toc-color').show();
        $('.add-bookmark-button').removeClass("active");
        $('.add-toc-button').addClass("active");
        $('#subBtn').removeClass("blue");
        $('#subBtn').addClass("orange");
        $('#bookmark_form').addClass("toc");
    } else {
        $('.bookmark-color').show();
        $('.toc-color').hide();
        $('.add-toc-button').removeClass("active");
        $('.add-bookmark-button').addClass("active");
        $('#subBtn').removeClass("orange")
        $('#subBtn').addClass("blue");
        $('#bookmark_form').addClass("bookmark");
    }    
    var window_height = $(window).height() - 39;
    $('video').animate({'height': (fullscreen) ? (window_height - 275) + 'px' : '250px'});
    $('#bookmark_form').slideDown();
    bookmark_form = true;

}


function hide_bookmark_form(canceled) {
    var window_height = $(window).height() - 39;
    bookmark_form = false;
    $("#video_shortcuts").css("display", "block");
    $('video').animate({'height': (fullscreen) ? window_height + 'px' : '525px'});

    $('#bookmark_form').slideUp();
    if (canceled) {
        document.getElementById('bookmark_title').value = '';
        document.getElementById('bookmark_description').value = '';
        document.getElementById('bookmark_keywords').value = '';
        document.getElementById('bookmark_level').value = '1';
    }
    $('.add-bookmark-button').removeClass("active");
    $('.add-toc-button').removeClass("active");
    $('#bookmark_form').removeClass("bookmark");
    $('#bookmark_form').removeClass("toc");

}

function toggle_bookmark_form(source) {

    origin = get_origin();

    from_shortcut = false;
    if (bookmark_form) {
        server_trace(new Array('4', 'bookmark_form_hide', current_album, current_asset, duration, time, type, source, quality, origin));
        hide_bookmark_form(false);

    } else {
        server_trace(new Array('4', 'bookmark_form_show', current_album, current_asset, duration, time, type, source, quality, origin));
        show_bookmark_form(source);
        $("#bookmark_title").focus();
    }
}

//===== THREAD =================================================================

/*
 * Hide or show thread form depending on his current state.
 */
function toggle_thread_form() {
    origin = get_origin();

    from_shortcut = false;
    if (thread_form) {
        server_trace(new Array('4', 'thread_form_hide', current_album, current_asset, duration, time, type, quality, origin));
        hide_thread_form(false);
        return;
    } else if (bookmark_form) {
//        $('#bookmark_form').hide();
        hide_bookmark_form(false);
        return;
    }
    server_trace(new Array('4', 'thread_form_show', current_album, current_asset, duration, time, type, quality, origin));
    show_thread_form();
    $("#thread_title").focus();
}

/*
 * Hide or show comment form depending on his current state.
 */
function toggle_comment_form() {
    if (comment_form) {
        server_trace(new Array('4', 'comment_form_hide', current_album, current_asset, duration, time, type));
        hide_comment_form();
    } else {
        server_trace(new Array('4', 'comment_form_show', current_album, current_asset, duration, time, type));
        show_comment_form();
        $("#comment_message").focus();
    }
}

// displays comment form (for reply) and create editor if it doesn't exist yet
function show_answer_comment_form(id) {
    // checks whether the editor already exists or not.
    // if it doesn't exist, it creates it.
    if (!$('#answer_comment_message_' + id + '_tinyeditor').hasClass('editor-created')) {
        tinymce.init({
            selector: 'textarea#' + 'answer_comment_message_' + id + '_tinyeditor',
            theme: "modern",
            height: 100,
            language: 'fr_FR',
            plugins: 'paste',
            paste_as_text: true,
            paste_merge_formats: false,
            menubar: false,
            statusbar: true,
            resize: true,
            toolbar: "undo redo | styleselect | bold italic underline | alignleft aligncenter alignjustify | bullist numlist",
            style_formats: [
                {title: 'Titre 1', block: 'h1'},
                {title: 'Titre 2', block: 'h2'},
                {title: 'Titre 3', block: 'h3'},
                {title: 'Indice', inline: 'sub'},
                {title: 'Exposant', inline: 'sup'}
            ]
        });

        $('#answer_comment_message_' + id + '_tinyeditor').addClass('editor-created');
    }
    if (tinymce.get('answer_comment_message_' + id + '_tinyeditor'))
        tinymce.get('answer_comment_message_' + id + '_tinyeditor').focus();
    $('.comment-options').hide();

    $('#answer_comment_form_' + id).slideDown();
    $("#answer_comment_message_" + id).focus();
    server_trace(new Array('4', 'answer_form_show', current_album, current_asset, duration, time, type, id));

}

function toggle_settings_form() {
    if (settings_form) {
        server_trace(new Array('4', 'settings_hide', current_album, current_asset));
        hide_settings_form();
    } else {
        server_trace(new Array('4', 'settings_show', current_album, current_asset));
        show_settings_form();
    }
}

// displays thread form 
function show_thread_form() {
    // Creates the editor only if it's not yet otherwise it will display 2 editors (or more)
    if (!$('#thread_desc_tinymce').hasClass('editor-created')) {
        tinymce.init({
            selector: "#thread_desc_tinymce",
            theme: "modern",
            width: 500,
            height: 100,
            language: 'fr_FR',
            plugins: 'paste',
            paste_as_text: true,
            paste_merge_formats: false,
            menubar: false,
            statusbar: false,
            toolbar: "undo redo | styleselect | bold italic underline | alignleft aligncenter alignjustify | bullist numlist",
            style_formats: [
                {title: 'Titre 1', block: 'h1'},
                {title: 'Titre 2', block: 'h2'},
                {title: 'Titre 3', block: 'h3'},
                {title: 'Indice', inline: 'sub'},
                {title: 'Exposant', inline: 'sup'}
            ]
        });

        $('#thread_desc_tinymce').addClass('editor-created');
    }
    $("#video_shortcuts").css("display", "none");
    if (document.getElementById('secondary_video')) {
        if (type == 'slide') {

            var video = document.getElementById('secondary_video');
        } else {

            var video = document.getElementById('main_video');
        }
    } else {
        var video = document.getElementById('main_video');
    }

    video.pause();
    document.getElementById('thread_timecode').value = Math.round(video.currentTime);

    $('.add-thread-button').removeClass("active");
    $('.add-thread-button').addClass("active");
    
    var window_height = $(window).height() - 39;
    $('video').animate({'height': (fullscreen) ? (window_height - 275) + 'px' : '250px'});
    $('#thread_form').slideDown();
    thread_form = true;
}

function show_comment_form() {
    if (!$('#comment_message_tinyeditor').hasClass('editor-created')) {
        tinymce.init({
            selector: "textarea#comment_message_tinyeditor",
            theme: "modern",
            height: 100,
            language: 'fr_FR',
            plugins: 'paste',
            paste_as_text: true,
            paste_merge_formats: false,
            menubar: false,
            statusbar: true,
            resize: true,
            toolbar: "undo redo | styleselect | bold italic underline | alignleft aligncenter alignjustify | bullist numlist",
            style_formats: [
                {title: 'Titre 1', block: 'h1'},
                {title: 'Titre 2', block: 'h2'},
                {title: 'Titre 3', block: 'h3'},
                {title: 'Indice', inline: 'sub'},
                {title: 'Exposant', inline: 'sup'}
            ]
        });
        $('#comment_message_tinyeditor').addClass('editor-created');
    }

    if (tinymce.get('comment_message_tinyeditor'))
        tinymce.get('comment_message_tinyeditor').focus();
    $('#comment_form').slideDown();
    $("html, body").animate({scrollTop: $(document).height()}, 1000);
    comment_form = true;
}

function hide_thread_form(canceled) {

    var window_height = $(window).height() - 39;

    $("#video_shortcuts").css("display", "block");
    $('video').animate({'height': (fullscreen) ? window_height + 'px' : '525px'});

    $('#thread_form').slideUp();
    if (canceled) {
        document.getElementById('thread_title').value = '';
        tinymce.get('thread_desc_tinymce').setContent('');
    }
    $('.add-thread-button').removeClass("active");

    thread_form = false;
}

function hide_comment_form() {
    comment_form = false;
    $('#comment_form').slideUp();
    document.getElementById('comment_message_tinyeditor').value = '';
}

function hide_answer_comment_form(id) {
    $('.comment-options').show();
    $('#answer_comment_form_' + id).slideUp();
    document.getElementById('answer_comment_message_' + id + '_tinyeditor').value = '';
    $('#answer_comment_message_' + id + '_tinyeditor').addClass('editor-created');
    server_trace(new Array('4', 'answer_form_hide', current_album, current_asset, duration, time, type, id));
}


//=== END - THREAD =============================================================
//
//===== BEGIN - SETTINGS =======================================================
function show_settings_form() {
    $('#settings_form').slideDown();
    $('#user-settings').addClass('active');
    settings_form = true;
}

function hide_settings_form() {
    $('#settings_form').slideUp();
    $('#user-settings').removeClass('active');
    settings_form = false;
}
//=== END - SETTINGS ===========================================================

function toggle_play() {
    if (type != "cam" && type != "slide")
        return;
    var video = document.getElementById('main_video');
    if (type == 'slide' && document.getElementById('secondary_video')) {
        var video = document.getElementById('secondary_video');
    }
    if (video.paused) {
        video.play();
    } else {
        video.pause();
    }
}

function video_navigate(forwardRewind) {
    origin = get_origin();
    if (document.getElementById('secondary_video')) {
        if (type == 'slide') {

            var video = document.getElementById('secondary_video');
        } else {

            var video = document.getElementById('main_video');
        }
    } else {
        var video = document.getElementById('main_video');
    }
    var paused = video.paused;
    //  video.load();  
    //  video.addEventListener('loadedmetadata', function() {        
    //      this.currentTime = time;
    //  }, false);      
    video.currentTime = (forwardRewind == 'forward') ? video.currentTime + 15 : video.currentTime - 15;
    paused ? video.pause() : video.play();
    server_trace(new Array('4', 'video_' + forwardRewind, current_album, current_asset, duration, time, type, quality, origin));
}

function video_volume(upDown) {
    origin = get_origin();
    var video = document.getElementById('main_video');
    var volume = video.volume;
    if (volume < 1 && upDown == 'up') {
        volume = volume + 0.05;
    } else if (volume > 0 && upDown == 'down') {
        volume = volume - 0.05;
    }

    if (document.getElementById('secondary_video')) {
        document.getElementById('secondary_video').volume = volume;
    }
    video.volume = volume;
    server_trace(new Array('4', 'video_volume_' + upDown, current_album, current_asset, duration, time, type, quality, origin));

}

function toggle_mute() {
    origin = get_origin();
    var video = document.getElementById('main_video');
    video.muted = !video.muted;
    if (document.getElementById('secondary_video')) {
        document.getElementById('secondary_video').muted = !video.muted;
    }
    server_trace(new Array('4', 'video_mute', current_album, current_asset, duration, time, type, quality, video.muted, origin));
}

function video_link() {
    from_shortcut = false;
    $(".share-button").click();
}

function video_fullscreen(on) {
    origin = get_origin();
    if (on) {
        fullscreen = true;

        $('.fullscreen-button').addClass("active");

        server_trace(new Array('4', 'video_fullscreen_enter', current_album, current_asset, duration, time, type, quality, origin));
    } else {
        fullscreen = false;
        
        $('.fullscreen-button').removeClass("active");
        server_trace(new Array('4', 'video_fullscreen_exit', current_album, current_asset, duration, time, type, quality, origin));
    }
    video_resize();
}

function video_resize() {
    if (fullscreen) {
        $('body').css('overflow', 'hidden');
        $('#video_player').css('width', '100%');
        $('#video_player').css('height', '100%');
        $('#video_player').css('position', 'fixed');
        var window_height = $(window).height();
        var window_width = $(window).width();
        var extra_height = 41; // .video_controls = 39px
        var extra_width = 0;

        if (bookmark_form || thread_form) {
            extra_height += 275; // #bookmark_form & #thread_form = 275px
        }

        if (show_panel) {
            extra_width += panel_width;
            $('#video_notifications').addClass('panel-active');
        }
        $('.video_controls').css('width', '100%');

        window_height -= extra_height;
        window_width -= extra_width;

        panel_fullscreen();
        $('#bookmark_form, #thread_form').css('width', window_width + 'px');
        
        $('video').css('width', window_width + 'px');
        $('video').css('height', window_height + 'px');

    } else {
        var width = 930;
        var height = 566;
        var extra_height = 41;
        var extra_width = 0;

        $('#video_player').css('height', height + 'px');
        $('#video_notifications').removeClass('panel-active');

        if (bookmark_form || thread_form) {
            extra_height += 275; // #bookmark_form & #thread_form = 275px
        }

        if (show_panel) {
            extra_width += panel_width;
        }
        height -= extra_height;
        width -= extra_width;

        $('.video_controls').css('width', width + 'px');

        panel_exit_fullscreen();

        $('#bookmark_form, #thread_form').css('width', width + 'px');
        
        $('video').css('width', width + 'px');
        $('video').css('height', height + 'px');
        $('#video_player').css('width', width + 'px');
        $('#video_player').css('position', 'relative');
        $('body').css('overflow', 'visible');
    }
}


function panel_resize() {
    $('#side_pane').css('height', ($("#div_right").height() - 125) + 'px');
    $('.bookmark_scroll, .toc_scroll').css('height', ($(".side_pane_content").height() - 110) + 'px');
    $('.no_content').css('height', ($(".side_pane_content").height() - 126) + 'px');
}

function panel_show() {
    if (fullscreen) {
        $('video, #bookmark_form, #thread_form').animate({
            width: ($(window).width() - panel_width) + 'px'
        });
        $('#div_right').animate({
            right: '0px'
        });
        $('#video_notifications').addClass('panel-active');
    } else {
        $('#div_right').css('height', '652px');
        $('video, .video_controls, #bookmark_form, #thread_form, #video_player').animate({
            width: '699px'
        });
        $('#side_wrapper').animate({
            right: '0px'
        }, function () {
            $('#div_right').css('overflow', 'visible');
        });
    }
    $('.panel-button').addClass('active');
    show_panel = true;
}

function panel_hide() {
    if (fullscreen) {
        $('#div_right').animate({
            right: '-300px'
        });
        $('video, #bookmark_form, #thread_form').animate({
            width: '100%'
        });
    } else {
        $('#div_right').css('overflow', 'hidden');
        $('video, .video_controls, #bookmark_form, #thread_form, #video_player').animate({
            width: '930px'
        });
        $('#side_wrapper').animate({
            right: '-232px'
        }, function () {
            $('#div_right').css('height', '80px');
        });

    }
    $('#video_notifications').removeClass('panel-active');
    $('.panel-button').removeClass('active');
    show_panel = false;

}

function toggle_panel() {
    origin = get_origin();
    if (show_panel) {
        panel_hide();
        server_trace(new Array('3', 'panel_hide', current_album, current_asset, duration, time, type, quality, origin));
    } else {
        panel_show();
        server_trace(new Array('3', 'panel_show', current_album, current_asset, duration, time, type, quality, origin));
    }
}

function panel_fullscreen() {
    var window_height = $(window).height() - 39;
    $('#div_right').css('right', (show_panel) ? '0px' : '-235px');
    $('#side_wrapper').css('right', '0px');
    $('#div_right').css('position', 'fixed');
    $('#div_right').css('height', window_height + 'px');
    $('#div_right').css('background-color', '#F1F1F1');
    $('#side-pane-scroll-area').css('height', '100%');
    $('.side_pane_content').css('height', '100%');
    panel_resize();

}

function panel_exit_fullscreen() {
    $('#div_right').css('position', 'relative');
    $('#div_right').css('right', '0px');
    $('#div_right').css('overflow', (show_panel) ? 'visible' : 'hidden');
    $('#side_wrapper').css('right', (show_panel) ? '0px' : '-235px');
    $('#div_right').css('height', (show_panel) ? '652px' : '80px');
    $('#div_right').css('background-color', '');
    $('#side_pane').css('height', '530px');
    $('#side-pane-scroll-area').css('height', '530px');
    $('.side_pane_content').css('height', '530px');
    $('.bookmark_scroll, .toc_scroll').css('height', '418px');
    $('.no_content').css('height', '402px');
    $('#div_right').css('display', 'block');
}

function toggle_shortcuts() {
    var action;
    origin = get_origin();
    shortcuts = !shortcuts;
    if (shortcuts)
        $('#video_shortcuts').css('height', '92.4%');
    $('.shortcuts').animate({'width': (shortcuts) ? 'show' : 'hide'}, function () {
        $('.shortcuts_tab a').toggleClass('active');
        if (!shortcuts)
            $('#video_shortcuts').css('height', '10%');
    });
    action = (shortcuts) ? 'show' : 'hide';
    server_trace(new Array('4', 'shortcuts_' + action, current_album, current_asset, duration, time, type, quality, origin));

}

function remove_notification_item(timecode, id) {
    delete threads_array[timecode][id];
    $('#notif_' + id).hide();
}

function scrollTo(component) {
//    while(typeof $('#' + component)[0] == 'undefined')
//        $('#' + component)[0].scrollIntoView(true);
    if (typeof $('#' + component)[0] != 'undefined')
        $('#' + component)[0].scrollIntoView(true);
}

function server_trace(array) {

    if (trace_on) { // from main.php
        $.ajax({
            type: 'POST',
            url: 'index.php?action=client_trace',
            data: {info: array}
        });
    }
    return true;
}

function get_origin() {
    if (from_shortcut) { // a key has been pressed to run the action
        from_shortcut = false;
        return "from_shortcut";
    } else {
        return "from_button";
    }
}