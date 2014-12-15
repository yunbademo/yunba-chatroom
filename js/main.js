'use strict';

var yunba_demo;

var userList = [];
var numUsers = 1;
var username = '游客#' + Math.floor(Math.random() * 100000);

function initialize() {
    initYunbaSDK();
    initChatroomEvent();
}

// 初始化 Yunba SDK 并连接到服务器
function initYunbaSDK() {
    logMessage('正在初始化...');
    $('#chatroom-input').attr('disabled', true);
    $('#btn-send-msg').attr('disabled', true);
    yunba_demo.init(function (success) {
        if (success) {
            logMessage('初始化成功...');
            connect();
        } else {
            logMessage('初始化失败或服务断线，若长时间无响应请尝试刷新页面');
            connect();
        }
    }, function () {
        logMessage('服务断线，正在尝试重新连接...');
        sendState('OFFLINE');
        connect();
    });
}

// 输出提示信息
function logMessage(data) {
    addMessageElement({log: data}, true);
}

// 初始化聊天室事件
function initChatroomEvent() {

    // 发送消息
    $('#btn-send-msg').click(function () {
        sendMessage();
    });

    $('#chatroom-input').keydown(function (event) {
        sendMessageOnEnter(event)
    });

    // 关闭浏览器告诉其他用户下线
    $(window).on("unload", function () {
        sendState('OFFLINE');
    });
}

// 连接服务器
function connect() {
    logMessage('正在尝试连接...');
    yunba_demo.connect(function (success, msg) {
        if (success) {
            logMessage('连接成功...');
            setMessageCallback();
            subscribe('CHATROOM_DEMO');
        } else {
            logMessage(msg);
        }
    });
}

// 订阅消息
function subscribe(topic) {
    logMessage('正在尝试加入房间...');
    yunba_demo.subscribe({'topic': topic}, function (success, msg) {
        if (success) {
            logMessage('加入房间成功...');
            sendState('ONLINE');
            getOnlineUsers();
            $('#chatroom-input').attr('disabled', false);
            $('#btn-send-msg').attr('disabled', false);
        } else {
            logMessage(msg);
        }
    });
}
// 取得在线用户
function getOnlineUsers() {
    var data = JSON.stringify({
        dataType: 'GET_ONLINE_USERS'
    });
    publish('CHATROOM_DEMO', data);
}

// 发送 在线/离线 状态
function sendState(onlineInfo) {
    var data = JSON.stringify({
        dataType: 'ONLINE_STATE',
        dataContent: onlineInfo, // 'ONLINE' or 'OFFLINE'
        username: username
    });
    publish('CHATROOM_DEMO', data);
}

// 发送消息
function sendMessage() {
    if ('' === $('#chatroom-input').val()) {
        return;
    }

    var data = JSON.stringify({
        dataType: 'MESSAGE',
        dataContent: $('#chatroom-input').val(),
        username: username
    });
    publish('CHATROOM_DEMO', data);
    $('#chatroom-input').val('');
}

function sendMessageOnEnter(event) {
    if (event.keyCode === 13) {
        event.preventDefault();
    } else {
        return;
    }

    if ($(event.target).attr('id') === 'chatroom-input') {
        sendMessage();
    }
}

// 发布消息
function publish(topic, message) {
    yunba_demo.publish({'topic': topic, 'msg': message}, function (success, msg) {
        if (success) {
            console.log('消息发布成功');
        } else {
            logMessage(msg);
        }
    });
}

// 设置接收到 message 的回调处理方法
function setMessageCallback() {
    yunba_demo.set_message_cb(function (data) {
        dataController(data.msg);
    });
}

// 接收到消息后处理消息内容
function dataController(data) {
    data = JSON.parse(data);
    if ('MESSAGE' === data.dataType) {
        addMessageElement(data);
    } else if ('ONLINE_STATE' === data.dataType) {
        userController(data);
    } else if ('GET_ONLINE_USERS' === data.dataType) {
        sendState('ONLINE');
    } else {
        console.log('发生错误...');
    }
}

// 处理在线用户列表
function userController(data) {
    var username = data.username;

    if ('ONLINE' === data.dataContent) {
        if (-1 === userList.indexOf(username)) {
            userList.push(username);
            numUsers = userList.length;
            addOnlineUserElement(username);
        }
    } else if ('OFFLINE' === data.dataContent) {
        var indexOf = userList.indexOf(username);
        if (-1 != indexOf) {
            userList.splice(indexOf, 1);
            numUsers = userList.length;
            removeOnlineUserElement(username);
        }
    }
}

// 在线用户列表中添加一个元素
function addOnlineUserElement(username) {
    var $chatOnlineList = $('#chat-online-list');
    var $userListItem = $('<li class="list-group-item"/>').text(username);
    $userListItem.attr('id', username);

    $chatOnlineList.append($userListItem);
}

// 在线用户列表中移除一个元素
function removeOnlineUserElement(username) {
    $('li[id="' + username + '"]').remove();
}

// 在聊天框中输出一条信息
function addMessageElement(data, isLog) {
    var $chatMessages = $('#chat-messages');
    if (isLog) {
        $chatMessages.append($('<li>').addClass('chat-log').text(data.log));
        $chatMessages.scrollTop($chatMessages[0].scrollHeight); // 滚动到最底部
        return;
    }

    var $usernameSpan = $('<span class="chat-username"/>').text(data.username);
    var $messageBodySpan = $('<span class="chat-message-body">').text(data.dataContent);
    var $messageLi = $('<li class="chat-message"/>')
        .data('username', data.username)
        .append($usernameSpan, $messageBodySpan);

    $chatMessages.append($messageLi);
    $chatMessages.scrollTop($chatMessages[0].scrollHeight);
}

$(document).ready(function () {
    yunba_demo = new Yunba({
        server: 'abjgw.yunba.io', port: 8181, appkey: '5487f75052be1f7e1dd834e8'
    });

    initialize();
});
